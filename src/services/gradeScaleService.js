import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const rangeDTO = (r) => ({
  id: r.id,
  grade: r.grade,
  minScore: Number(r.minScore),
  maxScore: Number(r.maxScore),
  gpaPoints: r.gpaPoints !== null ? Number(r.gpaPoints) : null,
  isPassing: r.isPassing,
});

const scaleDTO = (s) => ({
  id: s.id,
  orgId: s.OrgId,
  name: s.name,
  ranges: (s.ranges || []).map(rangeDTO),
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

export const getGradeScale = async (orgId) => {
  const scale = await prisma.grade_scale.findUnique({
    where: { OrgId: orgId },
    include: { ranges: { orderBy: { minScore: 'desc' } } },
  });
  return scale ? scaleDTO(scale) : null;
};

export const upsertGradeScale = async (orgId, { name, ranges }) => {
  if (!ranges || ranges.length === 0) {
    throw new AppError('At least one grade range is required', 400);
  }

  const scale = await prisma.$transaction(async (tx) => {
    const existing = await tx.grade_scale.findUnique({ where: { OrgId: orgId } });

    let scaleRecord;
    if (existing) {
      await tx.grade_scale_range.deleteMany({ where: { gradeScaleId: existing.id } });
      scaleRecord = await tx.grade_scale.update({
        where: { OrgId: orgId },
        data: { name: name ?? existing.name },
      });
    } else {
      scaleRecord = await tx.grade_scale.create({
        data: { OrgId: orgId, name: name ?? 'Standard' },
      });
    }

    await tx.grade_scale_range.createMany({
      data: ranges.map((r) => ({
        gradeScaleId: scaleRecord.id,
        grade: r.grade,
        minScore: Number(r.minScore),
        maxScore: Number(r.maxScore),
        gpaPoints: r.gpaPoints !== undefined ? Number(r.gpaPoints) : null,
        isPassing: r.isPassing ?? true,
      })),
    });

    return tx.grade_scale.findUnique({
      where: { id: scaleRecord.id },
      include: { ranges: { orderBy: { minScore: 'desc' } } },
    });
  });

  return scaleDTO(scale);
};

export const deleteGradeScale = async (orgId) => {
  const scale = await prisma.grade_scale.findUnique({ where: { OrgId: orgId } });
  if (!scale) throw new AppError('No grade scale configured for this organization', 404);
  await prisma.grade_scale.delete({ where: { OrgId: orgId } });
};

export const resolveLetterGrade = (score, scale) => {
  if (!scale || !scale.ranges || scale.ranges.length === 0) return null;
  const range = scale.ranges.find(
    (r) => Number(score) >= Number(r.minScore) && Number(score) <= Number(r.maxScore),
  );
  if (!range) return null;
  return {
    grade: range.grade,
    gpaPoints: range.gpaPoints !== null ? Number(range.gpaPoints) : null,
    isPassing: range.isPassing,
  };
};
