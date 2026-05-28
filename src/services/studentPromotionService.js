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
      const computedGrades = await tx.computed_grade.findMany({
        where: {
          studentId: student.Student_id,
          subjectId: { in: subjectIds },
          termId: { in: termIds },
        },
        select: { subjectId: true, rawScore: true, isPassed: true },
      });

      if (computedGrades.length > 0) {
        // Group by subject, average across terms
        const bySubject = {};
        for (const g of computedGrades) {
          if (!bySubject[g.subjectId]) bySubject[g.subjectId] = [];
          bySubject[g.subjectId].push(g);
        }
        subjectResults = subjectIds.map((sid) => {
          const grades = bySubject[sid];
          if (!grades || grades.length === 0) return null;
          const avgScore = grades.reduce((s, g) => s + Number(g.rawScore), 0) / grades.length;
          const isPassed = grades.every((g) => g.isPassed);
          return { subjectId: sid, avgScore, isPassed };
        });

        if (subjectResults.some((r) => r === null)) {
          return { decision: 'PENDING', finalPercentage: null, reason: 'Computed grades are incomplete for one or more subjects' };
        }
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
      subjectResults.push({ subjectId, avgScore, isPassed: avgScore >= minSubjectPass });
    }
  }

  const finalPercentage = round2(
    subjectResults.reduce((acc, r) => acc + r.avgScore, 0) / subjectResults.length,
  );

  const failedSubjects = subjectResults.filter((r) => !r.isPassed);
  const failedCount = failedSubjects.length;

  // Check required subjects
  const requiredIds = Array.isArray(settings.requiredSubjectIds) ? settings.requiredSubjectIds.map(Number) : [];
  const failedRequiredSubject = requiredIds.length > 0 && failedSubjects.some((r) => requiredIds.includes(r.subjectId));
  if (failedRequiredSubject) {
    return { decision: 'REPEATED', finalPercentage, reason: 'Student failed a required subject' };
  }

  const maxFailed = Number(settings.maxFailedSubjects ?? 0);
  const passThreshold = Number(settings.passThresholdPercentage);

  if (finalPercentage < passThreshold || failedCount > maxFailed) {
    if (settings.allowConditionalPromotion && failedCount <= Number(settings.conditionalMaxFailed ?? 1)) {
      return { decision: 'CONDITIONAL', finalPercentage, reason: `Conditional promotion: failed ${failedCount} subject(s)` };
    }
    if (failedCount > 0) {
      return { decision: 'REPEATED', finalPercentage, reason: `Student failed ${failedCount} subject(s)` };
    }
    return { decision: 'REPEATED', finalPercentage, reason: 'Student final percentage is below pass threshold' };
  }

  return { decision: 'PROMOTED', finalPercentage, reason: 'Student meets promotion criteria' };
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
    studentId: student.Student_id,
    decision: decisionResult.decision,
    fromGradeLevel,
    toGradeLevel,
    finalPercentage: decisionResult.finalPercentage,
    reason: decisionResult.reason,
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

    if (existingRun) {
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
        Student_id: true,
        Course_id: true,
        GradeLevel: true,
        AcademicStatus: true,
        DOB: true,
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

    await tx.organization_promotion_run.create({
      data: {
        OrgId: orgId,
        schoolYear,
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
