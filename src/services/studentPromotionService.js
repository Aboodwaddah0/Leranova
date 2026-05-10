import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { ensureCourseForGradeLevel } from './courseService.js';
import { MAX_GRADE_LEVEL, computeGradeLevelFromDob, getNextGradeLevel, getPromotionSchoolYear } from './gradePlacementService.js';
import { getOrCreateSchoolSettings, isPromotionDueToday } from './schoolSettingsService.js';

const round2 = (value) => Math.round(value * 100) / 100;

const evaluateStudentDecision = async (tx, student, settings) => {
  if (!student.Course_id) {
    return { decision: 'PENDING', finalPercentage: null, reason: 'Student is not assigned to a course' };
  }

  const subjects = await tx.subject.findMany({
    where: { Course_id: student.Course_id },
    select: { id: true },
  });

  if (!subjects.length) {
    return { decision: 'PENDING', finalPercentage: null, reason: 'No subjects found for current course' };
  }

  const subjectIds = subjects.map((subject) => subject.id);

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

  const subjectPercentages = [];

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

    subjectPercentages.push((weightedScore / weightedOutOf) * 100);
  }

  const finalPercentage = round2(
    subjectPercentages.reduce((acc, percentage) => acc + percentage, 0) / subjectPercentages.length,
  );

  const minSubjectPass = Number(settings.minSubjectPassPercentage);
  const passThreshold = Number(settings.passThresholdPercentage);
  const hasFailedSubject = subjectPercentages.some((percentage) => percentage < minSubjectPass);

  if (settings.requireAllSubjectsPass && hasFailedSubject) {
    return { decision: 'FAIL', finalPercentage, reason: 'Student failed at least one subject' };
  }

  if (finalPercentage < passThreshold) {
    return { decision: 'FAIL', finalPercentage, reason: 'Student final percentage is below pass threshold' };
  }

  return { decision: 'PASS', finalPercentage, reason: 'Student meets promotion criteria' };
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

const applyPromotionDecision = async (tx, student, decisionResult, schoolYear, orgId) => {
  const fromGradeLevel = student.GradeLevel;
  let toGradeLevel = fromGradeLevel;
  let courseId = student.Course_id;
  let academicStatus = student.AcademicStatus || 'ACTIVE';

  if (decisionResult.decision === 'PASS') {
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
  }

  if (decisionResult.decision === 'FAIL' && fromGradeLevel) {
    const sameGradeCourse = await ensureCourseForGradeLevel(orgId, fromGradeLevel, tx);
    toGradeLevel = fromGradeLevel;
    courseId = sameGradeCourse.id;
    academicStatus = 'ACTIVE';
  }

  if (decisionResult.decision === 'PENDING') {
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
      const decision = await evaluateStudentDecision(tx, student, settings);
      const result = await applyPromotionDecision(tx, student, decision, schoolYear, orgId);
      records.push(result);
    }

    const summary = {
      totalStudents: records.length,
      promoted: records.filter((record) => record.decision === 'PASS').length,
      repeated: records.filter((record) => record.decision === 'FAIL').length,
      pending: records.filter((record) => record.decision === 'PENDING').length,
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
