import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { resolveStudentContext } from './studentExperienceService.js';
import { computeAllGradesForTerm } from './gradingEngineService.js';

const QUIZ_PASS_THRESHOLD = 0.8; // 80 % of quizzes must be passed

// ── Academy ───────────────────────────────────────────────────────────────────

export const checkAcademyEligibility = async (userId, subjectId) => {
  const context = await resolveStudentContext(userId);
  if (context.mode !== 'ACADEMY') throw new AppError('Academy student profile required', 403);

  const subject = await prisma.course.findFirst({
    where: { id: subjectId, track: { Org_id: context.orgId } },
    select: {
      id: true,
      Course_id: true,
      track: { select: { id: true, Name: true } },
      lesson: {
        select: {
          id: true,
          quiz: { select: { id: true } },
        },
      },
    },
  });

  if (!subject) throw new AppError('Subject not found', 404);

  const lessons = subject.lesson;

  // Eligibility is based solely on quiz pass rate (80% threshold)
  const lessonIdsWithQuiz = lessons.filter((l) => l.quiz).map((l) => l.id);
  const quizTotal = lessonIdsWithQuiz.length;
  let quizPassed = 0;

  if (quizTotal > 0) {
    const passedAttempts = await prisma.quiz_attempt.findMany({
      where: {
        studentId: userId,
        isPassed: true,
        quiz: { lessonId: { in: lessonIdsWithQuiz } },
      },
      select: { quizId: true },
      distinct: ['quizId'],
    });
    quizPassed = passedAttempts.length;
  }

  const quizEligible = quizTotal === 0 || quizPassed / quizTotal >= QUIZ_PASS_THRESHOLD;
  const eligible = quizEligible;

  return {
    eligible,
    quizProgress: { passed: quizPassed, total: quizTotal },
    subjectId,
    trackId: subject.track.id,
    trackName: subject.track.Name,
  };
};

export const issueAcademyCertificate = async (userId, subjectId) => {
  const check = await checkAcademyEligibility(userId, subjectId);
  if (!check.eligible) throw new AppError('Eligibility requirements not met', 403);

  const context = await resolveStudentContext(userId);

  const cert = await prisma.student_certificate.upsert({
    where: { studentId_subjectId: { studentId: userId, subjectId } },
    create: { studentId: userId, orgId: context.orgId, subjectId, trackId: check.trackId },
    update: {},
    include: {
      subject: { select: { id: true, name: true } },
      track: { select: { id: true, Name: true } },
      organization: { select: { id: true, Name: true } },
    },
  });

  return _certDto(cert, userId);
};

export const getStudentCertificates = async (userId) => {
  // Get all published certificate records for this student
  const certs = await prisma.student_certificate.findMany({
    where: { studentId: userId, isPublished: true },
    include: {
      track:        { select: { id: true, Name: true, GradeLevel: true } },
      organization: { select: { id: true, Name: true } },
      term:         { select: { id: true, name: true, academic_year: { select: { name: true } } } },
    },
    orderBy: { issuedAt: 'desc' },
  });

  const user    = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const student = await prisma.student.findUnique({ where: { Student_id: userId }, select: { GradeLevel: true } });

  // Group by termId — one certificate per term (school report card)
  const byTerm = new Map();
  for (const c of certs) {
    const key = c.termId ?? `no-term-${c.id}`;
    if (!byTerm.has(key)) byTerm.set(key, c);
  }

  const result = [];
  for (const c of byTerm.values()) {
    // Fetch all subject grades for this student × term
    const grades = c.termId
      ? await prisma.computed_grade.findMany({
          where: { studentId: userId, termId: c.termId, OrgId: c.orgId },
          include: { course: { select: { id: true, name: true } } },
          orderBy: { course: { name: 'asc' } },
        })
      : [];

    const subjects = grades.map((g) => ({
      subjectId:   g.subjectId,
      subjectName: g.course?.name ?? null,
      rawScore:    Number(g.rawScore),
      letterGrade: g.letterGrade ?? null,
      gpaPoints:   g.gpaPoints != null ? Number(g.gpaPoints) : null,
      isPassed:    g.isPassed,
    }));

    const scores = subjects.map((s) => s.rawScore);
    const overallAverage = scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
      : 0;

    result.push({
      id:             c.id,
      studentId:      userId,
      studentName:    user?.name ?? null,
      gradeLevel:     c.track?.GradeLevel ?? student?.GradeLevel ?? null,
      trackName:      c.track?.Name ?? null,
      orgName:        c.organization?.Name ?? null,
      termId:         c.termId,
      termName:       c.term?.name ?? null,
      academicYear:   c.term?.academic_year?.name ?? null,
      subjects,
      overallAverage,
      issuedAt:       c.issuedAt,
    });
  }

  return result;
};

const _certDto = (c, userId, studentName) => ({
  id: c.id,
  studentId: userId,
  studentName: studentName ?? null,
  subjectId: c.subjectId,
  subjectName: c.subject?.name ?? null,
  trackId: c.trackId,
  trackName: c.track?.Name ?? null,
  orgName: c.organization?.Name ?? null,
  termName: c.term?.name ?? null,
  issuedAt: c.issuedAt,
});

// ── School ────────────────────────────────────────────────────────────────────

export const getSchoolTermCertificates = async (orgId, termId, gradeLevel) => {
  // Ensure grades are computed (idempotent upsert)
  await computeAllGradesForTerm(orgId, termId);

  const term = await prisma.term.findUnique({
    where: { id: termId },
    select: { id: true, name: true, academic_year: { select: { name: true } } },
  });
  if (!term) throw new AppError('Term not found', 404);

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { Name: true } });

  // Fetch computed grades, optionally filtered by grade level
  const grades = await prisma.computed_grade.findMany({
    where: {
      OrgId: orgId,
      termId,
      ...(gradeLevel !== undefined ? {
        course: { track: { GradeLevel: Number(gradeLevel) } },
      } : {}),
    },
    include: {
      student: {
        include: { user: { select: { id: true, name: true } } },
      },
      course: {
        select: {
          id: true,
          name: true,
          track: { select: { id: true, Name: true, GradeLevel: true } },
        },
      },
    },
    orderBy: [{ student: { user: { name: 'asc' } } }, { course: { name: 'asc' } }],
  });

  // Group by student
  const byStudent = {};
  for (const g of grades) {
    const sid = g.studentId;
    if (!byStudent[sid]) {
      byStudent[sid] = {
        studentId: sid,
        studentName: g.student?.user?.name ?? `Student ${sid}`,
        gradeLevel: g.course?.track?.GradeLevel ?? null,
        subjects: [],
        rawScores: [],
      };
    }
    byStudent[sid].subjects.push({
      subjectId: g.subjectId,
      subjectName: g.course?.name ?? null,
      rawScore: Number(g.rawScore),
      letterGrade: g.letterGrade,
      gpaPoints: g.gpaPoints !== null ? Number(g.gpaPoints) : null,
      isPassed: g.isPassed,
    });
    byStudent[sid].rawScores.push(Number(g.rawScore));
  }

  const students = Object.values(byStudent).map((s) => ({
    studentId: s.studentId,
    studentName: s.studentName,
    gradeLevel: s.gradeLevel,
    subjects: s.subjects,
    overallAverage: s.rawScores.length > 0
      ? Number((s.rawScores.reduce((a, b) => a + b, 0) / s.rawScores.length).toFixed(2))
      : 0,
  }));

  return {
    termId,
    termName: term.name,
    academicYear: term.academic_year?.name ?? null,
    orgName: org?.Name ?? null,
    students,
  };
};

// ── School certificate issuance & publishing (admin-controlled) ───────────────

export const issueSchoolCertificates = async (orgId, termId, { gradeLevel } = {}) => {
  // Ensure grades are computed first
  await computeAllGradesForTerm(orgId, termId);

  const grades = await prisma.computed_grade.findMany({
    where: {
      OrgId: orgId,
      termId,
      // Issue certificates to ALL students regardless of pass/fail
      ...(gradeLevel !== undefined ? {
        course: { track: { GradeLevel: Number(gradeLevel) } },
      } : {}),
    },
    include: {
      course: { select: { id: true, track: { select: { id: true } } } },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const g of grades) {
    try {
      const existing = await prisma.student_certificate.findFirst({
        where: { studentId: g.studentId, subjectId: g.subjectId, termId },
        select: { id: true },
      });
      if (existing) { skipped++; continue; }

      await prisma.student_certificate.create({
        data: {
          studentId: g.studentId,
          orgId,
          subjectId: g.subjectId,
          trackId: g.course.track.id,
          termId,
          isPublished: false,
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }

  const total = await prisma.student_certificate.count({ where: { orgId, termId } });
  return { created, skipped, total };
};

export const publishSchoolCertificates = async (orgId, termId) => {
  const existing = await prisma.student_certificate.count({ where: { orgId, termId } });
  if (existing === 0) {
    throw new AppError('No certificates issued for this term yet. Issue them first.', 409);
  }

  await prisma.student_certificate.updateMany({
    where: { orgId, termId, isPublished: false },
    data: { isPublished: true },
  });

  const published = await prisma.student_certificate.count({ where: { orgId, termId, isPublished: true } });
  return { published };
};

export const unpublishSchoolCertificates = async (orgId, termId) => {
  const existing = await prisma.student_certificate.count({ where: { orgId, termId, isPublished: true } });
  if (existing === 0) throw new AppError('No published certificates found for this term', 409);

  await prisma.student_certificate.updateMany({
    where: { orgId, termId, isPublished: true },
    data: { isPublished: false },
  });

  const draft = await prisma.student_certificate.count({ where: { orgId, termId, isPublished: false } });
  return { unpublished: draft };
};

export const getSchoolCertificateStatus = async (orgId, termId) => {
  const [total, published] = await Promise.all([
    prisma.student_certificate.count({ where: { orgId, termId } }),
    prisma.student_certificate.count({ where: { orgId, termId, isPublished: true } }),
  ]);
  return { total, published, draft: total - published };
};

export const getStudentSchoolCertificate = async (userId, termId) => {
  const context = await resolveStudentContext(userId);
  if (context.mode !== 'SCHOOL') throw new AppError('School student profile required', 403);

  const numTermId = Number(termId);
  if (!numTermId) throw new AppError('termId is required', 400);

  const term = await prisma.term.findFirst({
    where: { id: numTermId, academic_year: { OrgId: context.orgId } },
    select: { id: true, name: true, academic_year: { select: { name: true } } },
  });
  if (!term) throw new AppError('Term not found', 404);

  // Student can only view their certificate after the admin has published it
  const issuedCert = await prisma.student_certificate.findFirst({
    where: { studentId: userId, termId: numTermId, isPublished: true },
    select: { id: true },
  });
  if (!issuedCert) throw new AppError('Certificate not yet published by your school for this term', 403);

  const org = await prisma.organization.findUnique({ where: { id: context.orgId }, select: { Name: true } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const student = await prisma.student.findUnique({ where: { Student_id: userId }, select: { GradeLevel: true } });

  await computeAllGradesForTerm(context.orgId, numTermId);

  const grades = await prisma.computed_grade.findMany({
    where: { studentId: userId, termId: numTermId, OrgId: context.orgId },
    include: { course: { select: { id: true, name: true } } },
    orderBy: { course: { name: 'asc' } },
  });

  const subjects = grades.map((g) => ({
    subjectId: g.subjectId,
    subjectName: g.course?.name ?? null,
    rawScore: Number(g.rawScore),
    letterGrade: g.letterGrade,
    isPassed: g.isPassed,
  }));

  const scores = subjects.map((s) => s.rawScore);
  const overallAverage = scores.length > 0
    ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
    : 0;

  return {
    studentId: userId,
    studentName: user?.name ?? null,
    gradeLevel: student?.GradeLevel ?? null,
    termId: numTermId,
    termName: term.name,
    academicYear: term.academic_year?.name ?? null,
    orgName: org?.Name ?? null,
    subjects,
    overallAverage,
  };
};
