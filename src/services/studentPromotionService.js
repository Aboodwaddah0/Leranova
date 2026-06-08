import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { ensureCourseForGradeLevel } from './courseService.js';
import { MAX_GRADE_LEVEL, computeGradeLevelFromDob, getNextGradeLevel, getPromotionSchoolYear } from './gradePlacementService.js';
import { getOrCreateSchoolSettings, isPromotionDueToday } from './schoolSettingsService.js';

const round2 = (value) => Math.round(value * 100) / 100;

const evaluateStudentDecision = async (tx, student, settings, activeYearId) => {
  if (!student.Course_id) {
    return { decision: 'PENDING', finalPercentage: null, reason: 'Student is not assigned to a course' };
  }

  const subjects = await tx.course.findMany({
    where: { Course_id: student.Course_id },
    select: { id: true },
  });

  if (!subjects.length) {
    return { decision: 'PENDING', finalPercentage: null, reason: 'No subjects found for current course' };
  }

  const subjectIds = subjects.map((subject) => subject.id);

  // Prefer computed_grades from the active academic year's terms
  let subjectResults = null;
  if (activeYearId) {
    const termIds = (await tx.term.findMany({
      where: { academicYearId: activeYearId },
      select: { id: true },
    })).map((t) => t.id);

    if (termIds.length > 0) {
      // Fetch term names for the report
      const termMap = {};
      const terms = await tx.term.findMany({
        where: { id: { in: termIds } },
        select: { id: true, name: true, termNumber: true },
      });
      for (const t of terms) termMap[t.id] = t.name || `Term ${t.termNumber}`;

      const computedGrades = await tx.computed_grade.findMany({
        where: {
          studentId: student.Student_id,
          subjectId: { in: subjectIds },
          termId: { in: termIds },
        },
        include: {
          course: { select: { name: true } },
        },
      });

      if (computedGrades.length > 0) {
        // Track unique terms used
        const termsUsedMap = {};
        // Group by subject
        const bySubject = {};
        for (const g of computedGrades) {
          if (!bySubject[g.subjectId]) bySubject[g.subjectId] = { name: g.course?.name ?? null, grades: [] };
          bySubject[g.subjectId].grades.push(g);
          if (g.termId && !termsUsedMap[g.termId]) termsUsedMap[g.termId] = termMap[g.termId] ?? `Term ${g.termId}`;
        }

        const termsUsed = Object.entries(termsUsedMap).map(([id, name]) => ({ termId: Number(id), termName: name }));

        const subjectBreakdown = [];
        subjectResults = subjectIds.map((sid) => {
          const entry = bySubject[sid];
          if (!entry || entry.grades.length === 0) return null;
          const avgScore = entry.grades.reduce((s, g) => s + Number(g.rawScore), 0) / entry.grades.length;
          const isPassed = entry.grades.every((g) => g.isPassed);
          const termScores = entry.grades.map((g) => ({
            termId:   g.termId,
            termName: termMap[g.termId] ?? `Term ${g.termId}`,
            rawScore: Number(g.rawScore),
            isPassed: g.isPassed,
          }));
          subjectBreakdown.push({ subjectId: sid, subjectName: entry.name, avgScore, isPassed, termScores });
          return { subjectId: sid, avgScore, isPassed, subjectName: entry.name };
        });

        if (subjectResults.some((r) => r === null)) {
          return { decision: 'PENDING', finalPercentage: null, reason: 'Computed grades are incomplete for one or more subjects', termsUsed, subjectBreakdown: [], passedCount: 0, failedCount: 0 };
        }

        // Store breakdown for caller
        subjectResults._breakdown = subjectBreakdown;
        subjectResults._termsUsed = termsUsed;
      }
    }
  }

  // Fallback: use raw marks with ExamPercentage weights
  if (!subjectResults) {
    const marks = await tx.marks.findMany({
      where: {
        Student_id: student.Student_id,
        Subject_id: { in: subjectIds },
      },
      select: {
        Subject_id: true,
        Numbers: true,
        OutOf: true,
        ExamPercentage: true,
      },
    });

    const marksBySubject = new Map();
    for (const mark of marks) {
      const list = marksBySubject.get(mark.Subject_id) || [];
      list.push(mark);
      marksBySubject.set(mark.Subject_id, list);
    }

    const subjectCourses = await tx.course.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, name: true },
    });
    const subjectNameMap = {};
    for (const c of subjectCourses) subjectNameMap[c.id] = c.name;

    const minSubjectPass = Number(settings.minSubjectPassPercentage);
    subjectResults = [];

    for (const subjectId of subjectIds) {
      const subjectMarks = marksBySubject.get(subjectId) || [];
      if (!subjectMarks.length) {
        return { decision: 'PENDING', finalPercentage: null, reason: 'Marks are incomplete for one or more subjects' };
      }

      let weightedScore = 0;
      let weightedOutOf = 0;
      for (const mark of subjectMarks) {
        const weight = Number(mark.ExamPercentage) / 100;
        weightedScore += Number(mark.Numbers) * weight;
        weightedOutOf += Number(mark.OutOf) * weight;
      }

      if (weightedOutOf <= 0) {
        return { decision: 'PENDING', finalPercentage: null, reason: 'Invalid mark configuration for one or more subjects' };
      }

      const avgScore = (weightedScore / weightedOutOf) * 100;
      subjectResults.push({ subjectId, avgScore, isPassed: avgScore >= minSubjectPass, subjectName: subjectNameMap[subjectId] ?? null });
    }
  }

  const finalPercentage = round2(
    subjectResults.reduce((acc, r) => acc + r.avgScore, 0) / subjectResults.length,
  );

  const failedSubjects = subjectResults.filter((r) => !r.isPassed);
  const failedCount  = failedSubjects.length;
  const passedCount  = subjectResults.length - failedCount;
  const subjectBreakdown = subjectResults._breakdown ?? subjectResults.map((r) => ({ subjectId: r.subjectId, subjectName: r.subjectName ?? null, avgScore: r.avgScore, isPassed: r.isPassed, termScores: [] }));
  const termsUsed    = subjectResults._termsUsed ?? [];

  const base = { finalPercentage, subjectBreakdown, termsUsed, passedCount, failedCount };

  // Check required subjects
  const requiredIds = Array.isArray(settings.requiredSubjectIds) ? settings.requiredSubjectIds.map(Number) : [];
  const failedRequiredSubject = requiredIds.length > 0 && failedSubjects.some((r) => requiredIds.includes(r.subjectId));
  if (failedRequiredSubject) {
    const reqName = failedSubjects.find((r) => requiredIds.includes(r.subjectId))?.subjectName ?? 'required subject';
    return { ...base, decision: 'REPEATED', reason: `Failed required subject: ${reqName}` };
  }

  // Single threshold: "Max Failed Subjects" is the absolute ceiling on how
  // many subjects a student may fail and still be promoted. "Allow
  // Conditional Promotion" only controls whether promotions that involve
  // failed subjects are labelled Conditional or treated as a clean Pass.
  const maxFailed     = Number(settings.maxFailedSubjects ?? 0);
  const passThreshold = Number(settings.passThresholdPercentage);
  const failNames = () => failedSubjects.map((r) => r.subjectName ?? `Subject ${r.subjectId}`).join(', ');

  // Below the overall pass threshold is always a Fail, regardless of how many
  // individual subjects were failed — Conditional Promotion requires the
  // overall average to meet the threshold first.
  if (finalPercentage < passThreshold) {
    if (failedCount > 0) {
      return { ...base, decision: 'REPEATED', reason: `Average ${finalPercentage}% is below the pass threshold of ${passThreshold}% — failed ${failedCount} subject(s): ${failNames()}` };
    }
    return { ...base, decision: 'REPEATED', reason: `Average ${finalPercentage}% is below the pass threshold of ${passThreshold}%` };
  }

  if (failedCount === 0) {
    return { ...base, decision: 'PROMOTED', reason: `Passed all subjects with ${finalPercentage}% average` };
  }

  if (failedCount <= maxFailed) {
    if (settings.allowConditionalPromotion) {
      return { ...base, decision: 'CONDITIONAL', reason: `Conditional promotion — failed: ${failNames()}` };
    }
    return { ...base, decision: 'PROMOTED', reason: `Promoted with ${finalPercentage}% average — failed: ${failNames()}` };
  }

  return { ...base, decision: 'REPEATED', reason: `Failed ${failedCount} subject(s): ${failNames()}` };
};

const ensureSchoolOrg = async (tx, orgId) => {
  const organization = await tx.organization.findUnique({
    where: { id: orgId },
    select: { id: true, Role: true },
  });

  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  if (String(organization.Role || '').toUpperCase() !== 'SCHOOL') {
    throw new AppError('Promotion is only available for SCHOOL organizations', 403);
  }
};

const applyPromotionDecision = async (tx, student, decisionResult, schoolYear, orgId, academicYearId) => {
  const fromGradeLevel = student.GradeLevel;
  let toGradeLevel = fromGradeLevel;
  let courseId = student.Course_id;
  let academicStatus = student.AcademicStatus || 'ACTIVE';

  const isAdvancing = decisionResult.decision === 'PROMOTED' || decisionResult.decision === 'CONDITIONAL';

  if (isAdvancing) {
    if (!fromGradeLevel && student.DOB) {
      const settings = await getOrCreateSchoolSettings(orgId, tx);
      toGradeLevel = computeGradeLevelFromDob(student.DOB, settings);
    }

    if (toGradeLevel >= MAX_GRADE_LEVEL) {
      academicStatus = 'GRADUATED';
      courseId = null;
      toGradeLevel = MAX_GRADE_LEVEL;
    } else {
      const nextGrade = getNextGradeLevel(Number(toGradeLevel));
      if (!nextGrade) {
        academicStatus = 'GRADUATED';
        courseId = null;
      } else {
        const nextCourse = await ensureCourseForGradeLevel(orgId, nextGrade, tx);
        toGradeLevel = nextGrade;
        courseId = nextCourse.id;
      }
    }

    if (academicStatus === 'GRADUATED') {
      decisionResult = { ...decisionResult, decision: 'GRADUATED' };
    }
  } else if (decisionResult.decision === 'REPEATED' && fromGradeLevel) {
    const sameGradeCourse = await ensureCourseForGradeLevel(orgId, fromGradeLevel, tx);
    toGradeLevel = fromGradeLevel;
    courseId = sameGradeCourse.id;
    academicStatus = 'ACTIVE';
  } else if (decisionResult.decision === 'WITHHELD') {
    toGradeLevel = fromGradeLevel;
    courseId = student.Course_id;
    academicStatus = 'WITHHELD';
  } else if (decisionResult.decision === 'TRANSFERRED') {
    toGradeLevel = fromGradeLevel;
    courseId = null;
    academicStatus = 'TRANSFERRED';
  } else {
    // PENDING
    toGradeLevel = fromGradeLevel;
    courseId = student.Course_id;
  }

  await tx.student.update({
    where: { Student_id: student.Student_id },
    data: {
      GradeLevel: toGradeLevel,
      Course_id: courseId,
      AcademicStatus: academicStatus,
    },
  });

  await tx.student_promotion_history.upsert({
    where: {
      Student_id_schoolYear: {
        Student_id: student.Student_id,
        schoolYear,
      },
    },
    update: {
      fromGradeLevel,
      toGradeLevel,
      decision: decisionResult.decision,
      finalPercentage: decisionResult.finalPercentage,
      reason: decisionResult.reason,
      academicYearId: academicYearId ?? null,
      promotedAt: new Date(),
    },
    create: {
      Student_id: student.Student_id,
      OrgId: orgId,
      fromGradeLevel,
      toGradeLevel,
      decision: decisionResult.decision,
      finalPercentage: decisionResult.finalPercentage,
      reason: decisionResult.reason,
      schoolYear,
      academicYearId: academicYearId ?? null,
    },
  });

  return {
    studentId:          student.Student_id,
    studentName:        student.user?.name ?? null,
    registrationNumber: student.user?.registrationNumber ?? null,
    decision:           decisionResult.decision,
    fromGradeLevel,
    toGradeLevel,
    finalPercentage:    decisionResult.finalPercentage,
    reason:             decisionResult.reason,
    subjectBreakdown:   decisionResult.subjectBreakdown ?? [],
    termsUsed:          decisionResult.termsUsed ?? [],
    passedCount:        decisionResult.passedCount ?? 0,
    failedCount:        decisionResult.failedCount ?? 0,
  };
};

export const runAnnualPromotionForOrg = async (orgId, options = {}) => {
  // Gate: if an active academic year exists, all its terms must be CLOSED or LOCKED
  const activeYear = await prisma.academic_year.findFirst({
    where: { OrgId: orgId, isActive: true },
    include: { terms: { select: { id: true, status: true } } },
  });
  if (activeYear && activeYear.terms.length > 0) {
    const allClosed = activeYear.terms.every((t) => t.status === 'CLOSED' || t.status === 'LOCKED');
    if (!allClosed) {
      throw new AppError('All terms must be CLOSED or LOCKED before running promotion', 409);
    }
  }

  return prisma.$transaction(async (tx) => {
    await ensureSchoolOrg(tx, orgId);

    const settings = await getOrCreateSchoolSettings(orgId, tx);
    const schoolYear = options.schoolYear ?? getPromotionSchoolYear(settings);

    const existingRun = await tx.organization_promotion_run.findUnique({
      where: {
        OrgId_schoolYear: {
          OrgId: orgId,
          schoolYear,
        },
      },
    });

    if (existingRun && !options.force) {
      return {
        orgId,
        schoolYear,
        alreadyRan: true,
        summary: existingRun.summary,
      };
    }

    const students = await tx.student.findMany({
      where: {
        OrgId: orgId,
        AcademicStatus: { notIn: ['GRADUATED', 'FILED'] },
      },
      select: {
        Student_id:    true,
        Course_id:     true,
        GradeLevel:    true,
        AcademicStatus: true,
        DOB:           true,
        user:          { select: { name: true, registrationNumber: true } },
      },
      orderBy: { Student_id: 'asc' },
    });

    const records = [];
    for (const student of students) {
      const decision = await evaluateStudentDecision(tx, student, settings, activeYear?.id ?? null);
      const result = await applyPromotionDecision(tx, student, decision, schoolYear, orgId, activeYear?.id ?? null);
      records.push(result);
    }

    const summary = {
      totalStudents: records.length,
      promoted: records.filter((r) => r.decision === 'PROMOTED').length,
      conditional: records.filter((r) => r.decision === 'CONDITIONAL').length,
      graduated: records.filter((r) => r.decision === 'GRADUATED').length,
      repeated: records.filter((r) => r.decision === 'REPEATED').length,
      pending: records.filter((r) => r.decision === 'PENDING').length,
    };

    await tx.organization_promotion_run.upsert({
      where: {
        OrgId_schoolYear: {
          OrgId: orgId,
          schoolYear,
        },
      },
      create: {
        OrgId: orgId,
        schoolYear,
        status: 'SUCCESS',
        summary,
      },
      update: {
        status: 'SUCCESS',
        summary,
      },
    });

    // Lock all CLOSED terms in the active academic year
    if (activeYear) {
      await tx.term.updateMany({
        where: { academicYearId: activeYear.id, status: 'CLOSED' },
        data: { status: 'LOCKED' },
      });
    }

    return {
      orgId,
      schoolYear,
      alreadyRan: false,
      summary,
      records,
    };
  });
};

export const promoteStudentById = async (orgId, studentId, options = {}) => {
  // Gate: if an active academic year exists, all its terms must be CLOSED or LOCKED —
  // a single student shouldn't be promoted on unfinalized grades either.
  const activeYear = await prisma.academic_year.findFirst({
    where: { OrgId: orgId, isActive: true },
    include: { terms: { select: { id: true, status: true } } },
  });
  if (activeYear && activeYear.terms.length > 0) {
    const allClosed = activeYear.terms.every((t) => t.status === 'CLOSED' || t.status === 'LOCKED');
    if (!allClosed) {
      throw new AppError('All terms must be CLOSED or LOCKED before running promotion', 409);
    }
  }

  return prisma.$transaction(async (tx) => {
    await ensureSchoolOrg(tx, orgId);

    const settings = await getOrCreateSchoolSettings(orgId, tx);
    const schoolYear = options.schoolYear ?? getPromotionSchoolYear(settings);

    const student = await tx.student.findFirst({
      where: {
        Student_id: studentId,
        OrgId: orgId,
        AcademicStatus: { notIn: ['GRADUATED', 'FILED'] },
      },
      select: {
        Student_id:    true,
        Course_id:     true,
        GradeLevel:    true,
        AcademicStatus: true,
        DOB:           true,
        user:          { select: { name: true, registrationNumber: true } },
      },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const decision = await evaluateStudentDecision(tx, student, settings, activeYear?.id ?? null);
    const record = await applyPromotionDecision(tx, student, decision, schoolYear, orgId, activeYear?.id ?? null);

    return { orgId, studentId, schoolYear, record };
  });
};

export const runDuePromotions = async () => {
  const schoolOrganizations = await prisma.organization.findMany({
    where: {
      Role: 'SCHOOL',
      status: 'APPROVED',
    },
    select: { id: true },
  });

  const results = [];
  for (const organization of schoolOrganizations) {
    const settings = await getOrCreateSchoolSettings(organization.id);
    if (!isPromotionDueToday(settings)) {
      continue;
    }

    const result = await runAnnualPromotionForOrg(organization.id);
    results.push(result);
  }

  return results;
};
