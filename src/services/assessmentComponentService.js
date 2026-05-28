import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const toDTO = (c) => ({
  id: c.id,
  orgId: c.OrgId,
  subjectId: c.subjectId,
  termId: c.termId,
  name: c.name,
  weight: Number(c.weight),
  maxScore: Number(c.maxScore),
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const getWeightSum = async (orgId, subjectId, termId, excludeId = null) => {
  const where = {
    OrgId: orgId,
    subjectId: subjectId ?? null,
    termId: termId ?? null,
  };
  if (excludeId) where.id = { not: excludeId };

  const agg = await prisma.assessment_component.aggregate({
    where,
    _sum: { weight: true },
  });
  return Number(agg._sum.weight || 0);
};

export const listComponents = async (orgId, { subjectId, termId } = {}) => {
  const where = { OrgId: orgId };
  if (subjectId !== undefined) where.subjectId = subjectId ? Number(subjectId) : null;
  if (termId !== undefined) where.termId = termId ? Number(termId) : null;

  const rows = await prisma.assessment_component.findMany({
    where,
    orderBy: [{ subjectId: 'asc' }, { termId: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toDTO);
};

export const createComponent = async (orgId, { subjectId, termId, name, weight, maxScore }) => {
  const sid = subjectId ? Number(subjectId) : null;
  const tid = termId ? Number(termId) : null;

  const existing = await getWeightSum(orgId, sid, tid);
  if (existing + Number(weight) > 100) {
    throw new AppError(
      `Adding this component (${weight}%) would exceed 100%. Current total: ${existing}%. Remaining: ${(100 - existing).toFixed(2)}%.`,
      400,
    );
  }

  const component = await prisma.assessment_component.create({
    data: {
      OrgId: orgId,
      subjectId: sid,
      termId: tid,
      name,
      weight: Number(weight),
      maxScore: Number(maxScore ?? 100),
    },
  });
  return toDTO(component);
};

export const updateComponent = async (orgId, id, { name, weight, maxScore }) => {
  const component = await prisma.assessment_component.findFirst({
    where: { id: Number(id), OrgId: orgId },
  });
  if (!component) throw new AppError('Assessment component not found', 404);

  if (weight !== undefined) {
    const existing = await getWeightSum(orgId, component.subjectId, component.termId, Number(id));
    if (existing + Number(weight) > 100) {
      throw new AppError(
        `Updating this component to ${weight}% would exceed 100%. Other components total: ${existing}%. Remaining: ${(100 - existing).toFixed(2)}%.`,
        400,
      );
    }
  }

  const updated = await prisma.assessment_component.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(weight !== undefined && { weight: Number(weight) }),
      ...(maxScore !== undefined && { maxScore: Number(maxScore) }),
    },
  });
  return toDTO(updated);
};

export const deleteComponent = async (orgId, id) => {
  const component = await prisma.assessment_component.findFirst({
    where: { id: Number(id), OrgId: orgId },
  });
  if (!component) throw new AppError('Assessment component not found', 404);

  const linkedMarks = await prisma.marks.count({ where: { componentId: Number(id) } });
  if (linkedMarks > 0) {
    throw new AppError(
      `Cannot delete: ${linkedMarks} mark(s) are linked to this component. Remove or reassign those marks first.`,
      409,
    );
  }

  await prisma.assessment_component.delete({ where: { id: Number(id) } });
};
