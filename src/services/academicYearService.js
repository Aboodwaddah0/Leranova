import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const ensureSchoolOrg = async (orgId) => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, Role: true },
  });
  if (!org) throw new AppError('Organization not found', 404);
  if (org.Role !== 'SCHOOL') throw new AppError('This feature is only available for school organizations', 403);
  return org;
};

const toAcademicYearDto = (year, terms = undefined) => ({
  id: year.id,
  orgId: year.OrgId,
  name: year.name,
  startDate: year.startDate,
  endDate: year.endDate,
  numberOfTerms: year.numberOfTerms,
  isActive: year.isActive,
  termCount: terms !== undefined ? terms.length : (year.terms?.length ?? 0),
  terms: terms ?? year.terms?.map(toTermDto) ?? undefined,
  createdAt: year.createdAt,
  updatedAt: year.updatedAt,
});

const toTermDto = (term) => ({
  id: term.id,
  academicYearId: term.academicYearId,
  termNumber: term.termNumber,
  name: term.name,
  startDate: term.startDate,
  endDate: term.endDate,
  status: term.status,
  createdAt: term.createdAt,
  updatedAt: term.updatedAt,
});

export const createAcademicYear = async (orgId, data) => {
  await ensureSchoolOrg(orgId);

  // Only one active year per org — if creating a new one, deactivate the previous
  await prisma.academic_year.updateMany({
    where: { OrgId: orgId, isActive: true },
    data: { isActive: false },
  });

  const year = await prisma.academic_year.create({
    data: {
      OrgId: orgId,
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      numberOfTerms: data.numberOfTerms ?? 1,
      isActive: true,
    },
  });

  return toAcademicYearDto(year, []);
};

export const listAcademicYears = async (orgId) => {
  await ensureSchoolOrg(orgId);

  const years = await prisma.academic_year.findMany({
    where: { OrgId: orgId },
    include: { terms: { select: { id: true, status: true } } },
    orderBy: { startDate: 'desc' },
  });

  return years.map((y) => toAcademicYearDto(y, y.terms));
};

export const getAcademicYearById = async (orgId, yearId) => {
  await ensureSchoolOrg(orgId);

  const year = await prisma.academic_year.findFirst({
    where: { id: yearId, OrgId: orgId },
    include: {
      terms: { orderBy: { termNumber: 'asc' } },
    },
  });

  if (!year) throw new AppError('Academic year not found', 404);

  return toAcademicYearDto(year);
};

export const activateAcademicYear = async (orgId, yearId) => {
  await ensureSchoolOrg(orgId);

  const year = await prisma.academic_year.findFirst({
    where: { id: yearId, OrgId: orgId },
  });
  if (!year) throw new AppError('Session not found', 404);

  await prisma.academic_year.updateMany({
    where: { OrgId: orgId, isActive: true },
    data: { isActive: false },
  });

  const updated = await prisma.academic_year.update({
    where: { id: yearId },
    data: { isActive: true },
    include: { terms: { orderBy: { termNumber: 'asc' } } },
  });

  return toAcademicYearDto(updated);
};

export const updateAcademicYear = async (orgId, yearId, data) => {
  await ensureSchoolOrg(orgId);

  const year = await prisma.academic_year.findFirst({
    where: { id: yearId, OrgId: orgId },
    include: { terms: { select: { status: true } } },
  });

  if (!year) throw new AppError('Academic year not found', 404);

  const hasLockedTerm = year.terms.some((t) => t.status === 'LOCKED');
  if (hasLockedTerm) {
    throw new AppError('Cannot update an academic year that has locked terms', 403);
  }

  const currentTermCount = year.terms.length;
  if (data.numberOfTerms !== undefined && data.numberOfTerms < currentTermCount) {
    throw new AppError('Number of terms cannot be lower than the number of existing terms', 400);
  }

  const updated = await prisma.academic_year.update({
    where: { id: yearId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
      ...(data.numberOfTerms !== undefined && { numberOfTerms: data.numberOfTerms }),
    },
    include: { terms: { orderBy: { termNumber: 'asc' } } },
  });

  return toAcademicYearDto(updated);
};
