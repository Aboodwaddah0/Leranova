import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getEnrollmentsByOrg = async (orgId) => {
  return prisma.enrollment.findMany({
    where: { OrgId: Number(orgId) },
    include: { academy_user: true },
  });
};

const createEnrollment = async ({ user_Academy_id, OrgId }) => {
  const existing = await prisma.enrollment.findUnique({
    where: { user_Academy_id_OrgId: { user_Academy_id: Number(user_Academy_id), OrgId: Number(OrgId) } },
  });
  if (existing) throw new AppError('Already enrolled', 409);
  return prisma.enrollment.create({ data: { user_Academy_id: Number(user_Academy_id), OrgId: Number(OrgId) } });
};

const deleteEnrollment = async ({ user_Academy_id, OrgId }) => {
  await prisma.enrollment.delete({
    where: { user_Academy_id_OrgId: { user_Academy_id: Number(user_Academy_id), OrgId: Number(OrgId) } },
  });
};

export { getEnrollmentsByOrg, createEnrollment, deleteEnrollment };
