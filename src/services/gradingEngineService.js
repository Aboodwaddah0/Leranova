import prisma from '../utils/prisma.js';
import { getGradeScale, resolveLetterGrade } from './gradeScaleService.js';
import AppError from '../utils/appError.js';

const gradeDTO = (g) => ({
  id: g.id,
  studentId: g.studentId,
  subjectId: g.subjectId,
  termId: g.termId,
  orgId: g.OrgId,
  rawScore: Number(g.rawScore),
  letterGrade: g.letterGrade,
  gpaPoints: g.gpaPoints !== null ? Number(g.gpaPoints) : null,
  isPassed: g.isPassed,
  computedAt: g.computedAt,
});

export const computeStudentSubjectGrade = async (studentId, subjectId, termId, orgId) => {
  const marksWhere = {
    Student_id: studentId,
    Subject_id: subjectId,
    ...(termId ? { termId } : {}),
  };

  const marksList = await prisma.marks.findMany({ where: marksWhere });
  if (marksList.length === 0) return null;

  const components = await prisma.assessment_component.findMany({
    where: {
      OrgId: orgId,
      subjectId,
      ...(termId ? { termId } : { termId: null }),
    },
  });

  let rawScore;
  if (components.length > 0) {
    let weightedSum = 0;
    let weightUsed = 0;
    for (const comp of components) {
      const mark = marksList.find((m) => m.componentId === comp.id);
      if (mark) {
        const pct = (Number(mark.Numbers) / Number(mark.OutOf)) * 100;
        weightedSum += pct * (Number(comp.weight) / 100);
        weightUsed += Number(comp.weight);
      }
    }
    rawScore = weightUsed > 0 ? (weightedSum / weightUsed) * 100 : 0;
  } else {
    // Legacy: use ExamPercentage weight on marks
    let weightedSum = 0;
    let weightTotal = 0;
    for (const mark of marksList) {
      const pct = (Number(mark.Numbers) / Number(mark.OutOf)) * 100;
      const w = Number(mark.ExamPercentage);
      weightedSum += pct * (w / 100);
      weightTotal += w;
    }
    rawScore = weightTotal > 0 ? weightedSum : 0;
  }

  const settings = await prisma.organization_school_settings.findUnique({
    where: { OrgId: orgId },
    select: { minSubjectPassPercentage: true },
  });
  const passThreshold = settings ? Number(settings.minSubjectPassPercentage) : 50;

  const scale = await getGradeScale(orgId);
  const resolved = scale ? resolveLetterGrade(rawScore, scale) : null;

  const isPassed = resolved ? resolved.isPassing : rawScore >= passThreshold;
  const letterGrade = resolved ? resolved.grade : null;
  const gpaPoints = resolved ? resolved.gpaPoints : null;

  if (!termId) {
    return { studentId, subjectId, termId: null, orgId, rawScore, letterGrade, gpaPoints, isPassed, computedAt: new Date() };
  }

  const grade = await prisma.computed_grade.upsert({
    where: {
      studentId_subjectId_termId: { studentId, subjectId, termId },
    },
    create: {
      studentId,
      subjectId,
      termId,
      OrgId: orgId,
      rawScore,
      letterGrade,
      gpaPoints,
      isPassed,
      computedAt: new Date(),
    },
    update: {
      rawScore,
      letterGrade,
      gpaPoints,
      isPassed,
      computedAt: new Date(),
    },
  });

  return gradeDTO(grade);
};

export const computeAllGradesForTerm = async (orgId, termId) => {
  // Collect all student+subject pairs that have marks for this term
  const marksPairs = await prisma.marks.findMany({
    where: { termId },
    select: { Student_id: true, Subject_id: true },
    distinct: ['Student_id', 'Subject_id'],
  });

  let computed = 0;
  const errors = [];

  for (const { Student_id, Subject_id } of marksPairs) {
    try {
      await computeStudentSubjectGrade(Student_id, Subject_id, termId, orgId);
      computed++;
    } catch (err) {
      errors.push({ studentId: Student_id, subjectId: Subject_id, error: err.message });
    }
  }

  return { total: marksPairs.length, computed, errors };
};

export const listComputedGrades = async (orgId, { termId, subjectId, studentId } = {}) => {
  const where = { OrgId: orgId };
  if (termId) where.termId = Number(termId);
  if (subjectId) where.subjectId = Number(subjectId);
  if (studentId) where.studentId = Number(studentId);

  const rows = await prisma.computed_grade.findMany({
    where,
    include: {
      student: {
        select: {
          Student_id: true,
          GradeLevel: true,
          user: { select: { name: true, email: true } },
        },
      },
      course: { select: { id: true, name: true, Course_id: true } },
      term: { select: { id: true, name: true } },
    },
    orderBy: [{ rawScore: 'desc' }],
  });

  return rows.map((g) => ({
    ...gradeDTO(g),
    studentName: g.student?.user
      ? (g.student.user.name || '').trim()
      : `Student ${g.studentId}`,
    studentEmail: g.student?.user?.email || null,
    subjectName: g.course?.name || null,
    classId: g.course?.Course_id ?? null,
    gradeLevel: g.student?.GradeLevel ?? null,
    termName: g.term?.name || null,
  }));
};

export const getTermRankings = async (orgId, { termId, courseId } = {}) => {
  if (!termId) throw new AppError('termId is required for rankings', 400);

  const where = { OrgId: orgId, termId: Number(termId) };
  if (courseId) where.subjectId = Number(courseId);

  const rows = await prisma.computed_grade.findMany({
    where,
    include: {
      student: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: [{ studentId: 'asc' }],
  });

  // Group by student, compute average
  const byStudent = {};
  for (const g of rows) {
    if (!byStudent[g.studentId]) {
      byStudent[g.studentId] = {
        studentId: g.studentId,
        studentName: g.student?.user
          ? (g.student.user.name || '').trim()
          : `Student ${g.studentId}`,
        scores: [],
        grades: [],
      };
    }
    byStudent[g.studentId].scores.push(Number(g.rawScore));
    if (g.letterGrade) byStudent[g.studentId].grades.push(g.letterGrade);
  }

  const ranked = Object.values(byStudent)
    .map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      averageScore: s.scores.length > 0
        ? Number((s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(2))
        : 0,
      letterGrade: s.grades.length > 0 ? s.grades[0] : null,
    }))
    .sort((a, b) => b.averageScore - a.averageScore)
    .map((s, i) => ({ rank: i + 1, ...s }));

  return ranked;
};
