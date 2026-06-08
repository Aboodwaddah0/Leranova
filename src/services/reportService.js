/**
 * reportService.js
 * All report queries for School and Academy org types.
 * Every exported function receives (orgId, filters) and returns a plain DTO.
 */

import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

const num = (v) => (v !== undefined && v !== null && v !== '' ? Number(v) : undefined);
const strArr = (v) => (Array.isArray(v) ? v : undefined);

/** Verify a track (class/course) belongs to the org. */
const ensureTrackOwned = async (orgId, trackId) => {
  const track = await prisma.track.findFirst({
    where: { id: Number(trackId), Org_id: orgId },
    select: { id: true, Name: true, GradeLevel: true, kind: true },
  });
  if (!track) throw new AppError('Class/Course not found', 404);
  return track;
};

/** Verify a subject belongs to an org via its parent track. */
const ensureSubjectOwned = async (orgId, subjectId) => {
  const subject = await prisma.course.findFirst({
    where: { id: Number(subjectId), track: { Org_id: orgId } },
    select: { id: true, name: true },
  });
  if (!subject) throw new AppError('Subject not found', 404);
  return subject;
};

/** Verify an academic year belongs to the org. */
const ensureYearOwned = async (orgId, yearId) => {
  const year = await prisma.academic_year.findFirst({
    where: { id: Number(yearId), OrgId: orgId },
    select: { id: true, name: true },
  });
  if (!year) throw new AppError('Academic year not found', 404);
  return year;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SCHOOL REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 1. Academic (Marks) Report
 * Per-student, per-subject breakdown for a class + term.
 * Filters: classId (required), termId (required), studentId (optional)
 */
export const getSchoolAcademicReport = async (orgId, filters = {}) => {
  const { classId, termId, studentId } = filters;
  if (!classId || !termId) throw new AppError('classId and termId are required', 400);

  await ensureTrackOwned(orgId, classId);

  const subjects = await prisma.course.findMany({
    where: { Course_id: Number(classId) },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const studentWhere = {
    OrgId: orgId,
    Course_id: Number(classId),
    ...(studentId ? { Student_id: Number(studentId) } : {}),
  };

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: {
      Student_id: true,
      GradeLevel: true,
      user: { select: { id: true, name: true, registrationNumber: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const subjectIds = subjects.map((s) => s.id);
  const studentIds = students.map((s) => s.Student_id);

  const marks = await prisma.marks.findMany({
    where: {
      Student_id: { in: studentIds },
      Subject_id: { in: subjectIds },
      termId: Number(termId),
    },
    include: {
      component: { select: { id: true, name: true, weight: true, maxScore: true } },
    },
  });

  const computedGrades = await prisma.computed_grade.findMany({
    where: {
      studentId: { in: studentIds },
      subjectId: { in: subjectIds },
      termId: Number(termId),
    },
  });

  // Build per-student, per-subject matrix
  const rows = students.map((stu) => {
    const subjectResults = subjects.map((subj) => {
      const subjMarks = marks.filter(
        (m) => m.Student_id === stu.Student_id && m.Subject_id === subj.id
      );
      const cg = computedGrades.find(
        (g) => g.studentId === stu.Student_id && g.subjectId === subj.id
      );

      const components = subjMarks.map((m) => ({
        componentId: m.componentId ?? null,
        componentName: m.component?.name ?? m.MarkType,
        score: Number(m.Numbers),
        outOf: Number(m.OutOf),
        weight: Number(m.component?.weight ?? m.ExamPercentage),
      }));

      const totalScore = cg ? Number(cg.rawScore) : null;

      return {
        subjectId: subj.id,
        subjectName: subj.name,
        components,
        totalScore,
        letterGrade: cg?.letterGrade ?? null,
        gpaPoints: cg ? Number(cg.gpaPoints) : null,
        isPassed: cg?.isPassed ?? null,
      };
    });

    const subjectsWithGrades = subjectResults.filter((s) => s.totalScore !== null);
    const overallAvg =
      subjectsWithGrades.length > 0
        ? subjectsWithGrades.reduce((acc, s) => acc + s.totalScore, 0) / subjectsWithGrades.length
        : null;

    return {
      studentId: stu.Student_id,
      studentName: stu.user?.name ?? '-',
      registrationNumber: stu.user?.registrationNumber ?? null,
      gradeLevel: stu.GradeLevel,
      subjects: subjectResults,
      overallAverage: overallAvg !== null ? Math.round(overallAvg * 100) / 100 : null,
      passedAll: subjectsWithGrades.length > 0
        ? subjectsWithGrades.every((s) => s.isPassed !== false)
        : null,
    };
  });

  return {
    reportType: 'SCHOOL_ACADEMIC',
    classId: Number(classId),
    termId: Number(termId),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
    students: rows,
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 2. Attendance Report
 * Filters: classId (required), dateFrom, dateTo, status
 */
export const getSchoolAttendanceReport = async (orgId, filters = {}) => {
  const { classId, dateFrom, dateTo, status } = filters;
  if (!classId) throw new AppError('classId is required', 400);

  await ensureTrackOwned(orgId, classId);

  const dateFilter = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo)   dateFilter.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));

  const where = {
    classId: Number(classId),
    orgId,
    ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
    ...(status ? { status } : {}),
  };

  const records = await prisma.attendance.findMany({
    where,
    include: {
      student: {
        select: {
          Student_id: true,
          user: { select: { name: true, registrationNumber: true } },
        },
      },
    },
    orderBy: [{ date: 'asc' }, { student: { user: { name: 'asc' } } }],
  });

  // Per-student summary
  const summaryMap = new Map();
  for (const r of records) {
    const sid = r.studentId;
    if (!summaryMap.has(sid)) {
      summaryMap.set(sid, {
        studentId: sid,
        studentName: r.student?.user?.name ?? '-',
        registrationNumber: r.student?.user?.registrationNumber ?? null,
        total: 0, present: 0, absent: 0, late: 0, excused: 0,
      });
    }
    const entry = summaryMap.get(sid);
    entry.total++;
    const st = (r.status ?? '').toLowerCase();
    if (st === 'present') entry.present++;
    else if (st === 'absent') entry.absent++;
    else if (st === 'late') entry.late++;
    else if (st === 'excused') entry.excused++;
  }

  const summary = [...summaryMap.values()].map((s) => ({
    ...s,
    presentPct: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    absentPct:  s.total > 0 ? Math.round((s.absent  / s.total) * 100) : 0,
  }));

  const daily = records.map((r) => ({
    id: r.id,
    date: r.date,
    studentId: r.studentId,
    studentName: r.student?.user?.name ?? '-',
    status: r.status,
    note: r.note ?? null,
  }));

  return {
    reportType: 'SCHOOL_ATTENDANCE',
    classId: Number(classId),
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null,
    totalRecords: records.length,
    summary,
    daily,
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 3. Class Performance Report
 * All students × all subjects matrix for a class + term, with class ranking.
 * Filters: classId (required), termId (required)
 */
export const getSchoolClassPerformanceReport = async (orgId, filters = {}) => {
  const { classId, termId } = filters;
  if (!classId || !termId) throw new AppError('classId and termId are required', 400);

  await ensureTrackOwned(orgId, classId);

  const subjects = await prisma.course.findMany({
    where: { Course_id: Number(classId) },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const students = await prisma.student.findMany({
    where: { OrgId: orgId, Course_id: Number(classId) },
    select: {
      Student_id: true,
      user: { select: { name: true, registrationNumber: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });

  const studentIds = students.map((s) => s.Student_id);
  const subjectIds = subjects.map((s) => s.id);

  const grades = await prisma.computed_grade.findMany({
    where: {
      studentId: { in: studentIds },
      subjectId: { in: subjectIds },
      termId: Number(termId),
    },
  });

  const rows = students.map((stu) => {
    const subjectScores = subjects.map((subj) => {
      const cg = grades.find((g) => g.studentId === stu.Student_id && g.subjectId === subj.id);
      return {
        subjectId: subj.id,
        subjectName: subj.name,
        score: cg ? Number(cg.rawScore) : null,
        grade: cg?.letterGrade ?? null,
        isPassed: cg?.isPassed ?? null,
      };
    });

    const scored = subjectScores.filter((s) => s.score !== null);
    const avg = scored.length > 0
      ? Math.round((scored.reduce((a, s) => a + s.score, 0) / scored.length) * 100) / 100
      : null;
    const failedCount = subjectScores.filter((s) => s.isPassed === false).length;

    return {
      studentId: stu.Student_id,
      studentName: stu.user?.name ?? '-',
      registrationNumber: stu.user?.registrationNumber ?? null,
      subjects: subjectScores,
      average: avg,
      failedSubjects: failedCount,
      rank: null, // filled below
    };
  });

  // Rank by average descending
  const ranked = [...rows]
    .filter((r) => r.average !== null)
    .sort((a, b) => b.average - a.average);
  ranked.forEach((r, i) => { r.rank = i + 1; });

  const classAvg = ranked.length > 0
    ? Math.round((ranked.reduce((a, r) => a + r.average, 0) / ranked.length) * 100) / 100
    : null;

  return {
    reportType: 'SCHOOL_CLASS_PERFORMANCE',
    classId: Number(classId),
    termId: Number(termId),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
    students: rows,
    classAverage: classAvg,
    topStudents: ranked.slice(0, 3).map((r) => ({ studentId: r.studentId, name: r.studentName, average: r.average })),
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 4. Subject Analytics Report
 * Score distribution, pass rate, min/max/avg for a single subject.
 * Filters: subjectId (required), termId (required)
 */
export const getSchoolSubjectAnalyticsReport = async (orgId, filters = {}) => {
  const { subjectId, termId } = filters;
  if (!subjectId || !termId) throw new AppError('subjectId and termId are required', 400);

  await ensureSubjectOwned(orgId, subjectId);

  const grades = await prisma.computed_grade.findMany({
    where: { subjectId: Number(subjectId), termId: Number(termId), OrgId: orgId },
    include: {
      student: { select: { Student_id: true, user: { select: { name: true } } } },
    },
  });

  const scores = grades.map((g) => Number(g.rawScore));
  const passed = grades.filter((g) => g.isPassed).length;

  const buckets = { '0-49': 0, '50-64': 0, '65-74': 0, '75-84': 0, '85-100': 0 };
  for (const s of scores) {
    if (s < 50)       buckets['0-49']++;
    else if (s < 65)  buckets['50-64']++;
    else if (s < 75)  buckets['65-74']++;
    else if (s < 85)  buckets['75-84']++;
    else              buckets['85-100']++;
  }

  const avg = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
    : null;

  const perStudent = grades.map((g) => ({
    studentId: g.studentId,
    studentName: g.student?.user?.name ?? '-',
    score: Number(g.rawScore),
    grade: g.letterGrade ?? null,
    isPassed: g.isPassed,
  }));

  return {
    reportType: 'SCHOOL_SUBJECT_ANALYTICS',
    subjectId: Number(subjectId),
    termId: Number(termId),
    totalStudents: grades.length,
    average: avg,
    highest: scores.length ? Math.max(...scores) : null,
    lowest: scores.length ? Math.min(...scores) : null,
    passCount: passed,
    failCount: grades.length - passed,
    passRate: grades.length > 0 ? Math.round((passed / grades.length) * 100) : 0,
    distribution: buckets,
    students: perStudent,
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 5. Parent Notes Report
 * Filters: classId (optional), studentId (optional), dateFrom, dateTo
 */
export const getSchoolParentNotesReport = async (orgId, filters = {}) => {
  const { classId, studentId, dateFrom, dateTo } = filters;

  const dateFilter = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo)   dateFilter.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));

  // Resolve student IDs from classId if provided
  let studentIds;
  if (studentId) {
    studentIds = [Number(studentId)];
  } else if (classId) {
    const studs = await prisma.student.findMany({
      where: { OrgId: orgId, Course_id: Number(classId) },
      select: { Student_id: true },
    });
    studentIds = studs.map((s) => s.Student_id);
  }

  const notes = await prisma.student_note.findMany({
    where: {
      orgId,
      ...(studentIds ? { studentId: { in: studentIds } } : {}),
      ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
    },
    include: {
      student: { select: { Student_id: true, user: { select: { name: true, registrationNumber: true } } } },
      teacher: { select: { Teacher_id: true, user: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = notes.map((n) => ({
    id: n.id,
    studentId: n.studentId,
    studentName: n.student?.user?.name ?? '-',
    registrationNumber: n.student?.user?.registrationNumber ?? null,
    teacherName: n.teacher?.user?.name ?? '-',
    title: n.title ?? null,
    content: n.content,
    isRead: n.isRead,
    date: n.createdAt,
  }));

  return {
    reportType: 'SCHOOL_PARENT_NOTES',
    totalNotes: rows.length,
    unreadNotes: rows.filter((r) => !r.isRead).length,
    notes: rows,
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 6. Term Summary Report
 * Filters: yearId (required), termId (required)
 */
export const getSchoolTermSummaryReport = async (orgId, filters = {}) => {
  const { yearId, termId } = filters;
  if (!yearId || !termId) throw new AppError('yearId and termId are required', 400);

  await ensureYearOwned(orgId, yearId);

  const term = await prisma.term.findFirst({
    where: { id: Number(termId), academicYearId: Number(yearId) },
    select: { id: true, name: true, termNumber: true, status: true },
  });
  if (!term) throw new AppError('Term not found', 404);

  // All students in this org
  const students = await prisma.student.findMany({
    where: { OrgId: orgId },
    select: {
      Student_id: true,
      GradeLevel: true,
      Course_id: true,
      user: { select: { name: true, registrationNumber: true } },
    },
  });

  const studentIds = students.map((s) => s.Student_id);

  const grades = await prisma.computed_grade.findMany({
    where: { studentId: { in: studentIds }, termId: Number(termId), OrgId: orgId },
  });

  // Group grades by student
  const byStudent = new Map();
  for (const g of grades) {
    if (!byStudent.has(g.studentId)) byStudent.set(g.studentId, []);
    byStudent.get(g.studentId).push(g);
  }

  const promotions = await prisma.student_promotion_history.findMany({
    where: { Student_id: { in: studentIds }, academicYearId: Number(yearId) },
  });

  const certificates = await prisma.student_certificate.findMany({
    where: { studentId: { in: studentIds }, termId: Number(termId), orgId },
    select: { studentId: true, isPublished: true },
  });

  const certByStudent = new Map();
  for (const c of certificates) {
    if (!certByStudent.has(c.studentId)) certByStudent.set(c.studentId, { total: 0, published: 0 });
    const entry = certByStudent.get(c.studentId);
    entry.total++;
    if (c.isPublished) entry.published++;
  }

  let passedAll = 0, failedOne = 0;

  const rows = students.map((stu) => {
    const stuGrades = byStudent.get(stu.Student_id) ?? [];
    const failed = stuGrades.filter((g) => !g.isPassed).length;
    const avg = stuGrades.length > 0
      ? Math.round((stuGrades.reduce((a, g) => a + Number(g.rawScore), 0) / stuGrades.length) * 100) / 100
      : null;
    const allPassed = stuGrades.length > 0 && failed === 0;
    if (allPassed) passedAll++;
    else if (stuGrades.length > 0) failedOne++;

    const promo = promotions.find((p) => p.Student_id === stu.Student_id);
    const certs = certByStudent.get(stu.Student_id) ?? { total: 0, published: 0 };

    return {
      studentId: stu.Student_id,
      studentName: stu.user?.name ?? '-',
      registrationNumber: stu.user?.registrationNumber ?? null,
      gradeLevel: stu.GradeLevel,
      average: avg,
      failedSubjects: failed,
      passedAll: allPassed,
      promotionDecision: promo?.decision ?? null,
      certCount: certs.total,
      certPublished: certs.published,
    };
  });

  return {
    reportType: 'SCHOOL_TERM_SUMMARY',
    yearId: Number(yearId),
    termId: Number(termId),
    termName: term.name,
    termStatus: term.status,
    totalStudents: students.length,
    passedAll,
    failedAtLeastOne: failedOne,
    noGradesYet: students.length - passedAll - failedOne,
    students: rows,
    generatedAt: new Date().toISOString(),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ACADEMY REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 7. Enrollment Report
 * Filters: courseId (optional), dateFrom, dateTo
 */
export const getAcademyEnrollmentReport = async (orgId, filters = {}) => {
  const { courseId, dateFrom, dateTo } = filters;

  const dateFilter = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo)   dateFilter.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));

  const where = {
    track: { Org_id: orgId },
    ...(courseId ? { Course_id: Number(courseId) } : {}),
    ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
  };

  const enrollments = await prisma.enrollment.findMany({
    where,
    include: {
      academy_user: {
        include: { user: { select: { name: true, email: true, registrationNumber: true } } },
      },
      track: { select: { id: true, Name: true, isPaid: true, price: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = enrollments.map((e) => ({
    studentId: e.user_Academy_id,
    studentName: e.academy_user?.user?.name ?? '-',
    email: e.academy_user?.user?.email ?? null,
    registrationNumber: e.academy_user?.user?.registrationNumber ?? null,
    courseId: e.Course_id,
    courseName: e.track?.Name ?? '-',
    enrolledAt: e.createdAt,
  }));

  // Course breakdown
  const byCourse = new Map();
  for (const r of rows) {
    if (!byCourse.has(r.courseId)) byCourse.set(r.courseId, { courseId: r.courseId, courseName: r.courseName, count: 0 });
    byCourse.get(r.courseId).count++;
  }

  return {
    reportType: 'ACADEMY_ENROLLMENT',
    totalEnrollments: rows.length,
    byCourse: [...byCourse.values()],
    enrollments: rows,
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 8. Student Progress Report
 * Filters: courseId (required), studentId (optional)
 */
export const getAcademyProgressReport = async (orgId, filters = {}) => {
  const { courseId, studentId } = filters;
  if (!courseId) throw new AppError('courseId is required', 400);

  await ensureTrackOwned(orgId, courseId);

  // All subjects in this course
  const subjects = await prisma.course.findMany({
    where: { Course_id: Number(courseId) },
    select: {
      id: true,
      name: true,
      lesson: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const allLessonIds = subjects.flatMap((s) => s.lesson.map((l) => l.id));
  const totalLessons = allLessonIds.length;

  const enrollmentWhere = {
    Course_id: Number(courseId),
    academy_user: {
      is: {
        OrgId: orgId,
        ...(studentId ? { user_academy_id: Number(studentId) } : {}),
      },
    },
  };

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentWhere,
    include: {
      academy_user: {
        include: { user: { select: { id: true, name: true, email: true, registrationNumber: true } } },
      },
    },
  });

  const studentIds = enrollments.map((e) => e.user_Academy_id);

  const progress = await prisma.lesson_progress.findMany({
    where: {
      studentId: { in: studentIds },
      lessonId: { in: allLessonIds },
    },
  });

  const rows = enrollments.map((e) => {
    const sid = e.user_Academy_id;
    const stuProgress = progress.filter((p) => p.studentId === sid);
    const completed = stuProgress.filter((p) => p.isCompleted).length;
    const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
    const lastActive = stuProgress.length > 0
      ? new Date(Math.max(...stuProgress.map((p) => new Date(p.updatedAt).getTime())))
      : null;

    const subjectBreakdown = subjects.map((subj) => {
      const lessonIds = subj.lesson.map((l) => l.id);
      const subjProgress = stuProgress.filter((p) => lessonIds.includes(p.lessonId));
      const subjCompleted = subjProgress.filter((p) => p.isCompleted).length;
      return {
        subjectId: subj.id,
        subjectName: subj.name,
        totalLessons: lessonIds.length,
        completedLessons: subjCompleted,
        completionPct: lessonIds.length > 0 ? Math.round((subjCompleted / lessonIds.length) * 100) : 0,
      };
    });

    return {
      studentId: sid,
      studentName: e.academy_user?.user?.name ?? '-',
      email: e.academy_user?.user?.email ?? null,
      registrationNumber: e.academy_user?.user?.registrationNumber ?? null,
      totalLessons,
      completedLessons: completed,
      completionPct: pct,
      lastActiveAt: lastActive,
      subjects: subjectBreakdown,
    };
  });

  const avgCompletion = rows.length > 0
    ? Math.round(rows.reduce((a, r) => a + r.completionPct, 0) / rows.length)
    : 0;

  return {
    reportType: 'ACADEMY_PROGRESS',
    courseId: Number(courseId),
    totalStudents: rows.length,
    totalLessons,
    averageCompletion: avgCompletion,
    students: rows,
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 9. Quiz Performance Report
 * Filters: courseId (required), subjectId (optional)
 */
export const getAcademyQuizReport = async (orgId, filters = {}) => {
  const { courseId, subjectId } = filters;
  if (!courseId) throw new AppError('courseId is required', 400);

  await ensureTrackOwned(orgId, courseId);

  const subjectWhere = {
    Course_id: Number(courseId),
    ...(subjectId ? { id: Number(subjectId) } : {}),
  };

  const subjects = await prisma.course.findMany({
    where: subjectWhere,
    select: {
      id: true,
      name: true,
      lesson: {
        select: {
          id: true,
          name: true,
          quiz: {
            select: {
              id: true,
              title: true,
              passingScore: true,
              difficulty: true,
              attempts: {
                select: { id: true, studentId: true, score: true, isPassed: true, createdAt: true },
              },
            },
          },
        },
      },
    },
  });

  const quizStats = [];
  for (const subj of subjects) {
    for (const lesson of subj.lesson) {
      if (!lesson.quiz) continue;
      const q = lesson.quiz;
      const scores = q.attempts.map((a) => a.score);
      const passed = q.attempts.filter((a) => a.isPassed).length;
      const avg = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : null;

      quizStats.push({
        subjectId: subj.id,
        subjectName: subj.name,
        lessonId: lesson.id,
        lessonName: lesson.name,
        quizId: q.id,
        quizTitle: q.title,
        difficulty: q.difficulty,
        passingScore: q.passingScore,
        totalAttempts: q.attempts.length,
        uniqueStudents: new Set(q.attempts.map((a) => a.studentId)).size,
        passCount: passed,
        failCount: q.attempts.length - passed,
        passRate: q.attempts.length > 0 ? Math.round((passed / q.attempts.length) * 100) : 0,
        averageScore: avg,
        highestScore: scores.length ? Math.max(...scores) : null,
        lowestScore: scores.length ? Math.min(...scores) : null,
      });
    }
  }

  return {
    reportType: 'ACADEMY_QUIZ',
    courseId: Number(courseId),
    totalQuizzes: quizStats.length,
    quizzes: quizStats,
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 10. Revenue Report
 * Filters: dateFrom, dateTo, courseId (optional)
 */
export const getAcademyRevenueReport = async (orgId, filters = {}) => {
  const { dateFrom, dateTo, courseId } = filters;

  const dateFilter = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo)   dateFilter.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));

  const paymentWhere = {
    academy_user: { is: { OrgId: orgId } },
    ...(courseId ? { Course_id: Number(courseId) } : {}),
    ...(Object.keys(dateFilter).length ? { paidAt: dateFilter } : {}),
  };

  const payments = await prisma.student_course_payment.findMany({
    where: paymentWhere,
    include: {
      academy_user: { include: { user: { select: { name: true, email: true } } } },
      track: { select: { id: true, Name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Aggregations
  const totalRevenue = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((a, p) => a + Number(p.amount), 0);

  const byCourse = new Map();
  for (const p of payments) {
    const cid = p.Course_id;
    if (!byCourse.has(cid)) {
      byCourse.set(cid, { courseId: cid, courseName: p.track?.Name ?? '-', total: 0, completed: 0, pending: 0, failed: 0 });
    }
    const entry = byCourse.get(cid);
    entry.total += Number(p.amount);
    if (p.status === 'COMPLETED') entry.completed += Number(p.amount);
    else if (p.status === 'PENDING') entry.pending += Number(p.amount);
    else if (p.status === 'FAILED') entry.failed += Number(p.amount);
  }

  const rows = payments.map((p) => ({
    paymentId: p.id,
    studentName: p.academy_user?.user?.name ?? '-',
    email: p.academy_user?.user?.email ?? null,
    courseId: p.Course_id,
    courseName: p.track?.Name ?? '-',
    amount: Number(p.amount),
    status: p.status,
    paymentMethod: p.paymentMethod,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  }));

  const byStatus = { COMPLETED: 0, PENDING: 0, FAILED: 0 };
  for (const p of payments) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  }

  return {
    reportType: 'ACADEMY_REVENUE',
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalTransactions: payments.length,
    byStatus,
    byCourse: [...byCourse.values()],
    payments: rows,
    generatedAt: new Date().toISOString(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 11. Course Completion Report
 * Filters: dateFrom, dateTo (optional)
 */
export const getAcademyCourseCompletionReport = async (orgId, filters = {}) => {
  const { dateFrom, dateTo } = filters;

  const courses = await prisma.track.findMany({
    where: { Org_id: orgId, kind: 'TRACK' },
    select: {
      id: true,
      Name: true,
      courses: {
        select: {
          id: true,
          lesson: { select: { id: true } },
        },
      },
    },
  });

  const dateFilter = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo)   dateFilter.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));

  const rows = await Promise.all(
    courses.map(async (course) => {
      const allLessonIds = course.courses.flatMap((s) => s.lesson.map((l) => l.id));
      const totalLessons = allLessonIds.length;

      const enrollmentWhere = {
        Course_id: course.id,
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      };

      const totalEnrolled = await prisma.enrollment.count({ where: enrollmentWhere });
      if (totalEnrolled === 0 || totalLessons === 0) {
        return {
          courseId: course.id,
          courseName: course.Name,
          totalEnrolled,
          totalLessons,
          fullyCompleted: 0,
          avgCompletionPct: 0,
        };
      }

      // Count students who completed every lesson
      const enrollments = await prisma.enrollment.findMany({
        where: enrollmentWhere,
        select: { user_Academy_id: true },
      });
      const studentIds = enrollments.map((e) => e.user_Academy_id);

      const progressCounts = await prisma.lesson_progress.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: studentIds },
          lessonId: { in: allLessonIds },
          isCompleted: true,
        },
        _count: { lessonId: true },
      });

      const fullyCompleted = progressCounts.filter((p) => p._count.lessonId >= totalLessons).length;
      const avgPct = progressCounts.length > 0
        ? Math.round(progressCounts.reduce((a, p) => a + (p._count.lessonId / totalLessons) * 100, 0) / studentIds.length)
        : 0;

      return {
        courseId: course.id,
        courseName: course.Name,
        totalEnrolled,
        totalLessons,
        fullyCompleted,
        avgCompletionPct: avgPct,
      };
    })
  );

  return {
    reportType: 'ACADEMY_COMPLETION',
    totalCourses: rows.length,
    courses: rows.sort((a, b) => b.avgCompletionPct - a.avgCompletionPct),
    generatedAt: new Date().toISOString(),
  };
};
