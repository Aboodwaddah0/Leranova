import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getAcademyUsersByOrg = async (orgId) => {
  return prisma.academy_user.findMany({
    where: { OrgId: Number(orgId) },
    include: { user: { select: { id: true, Name: true, Email: true, Role: true } } },
  });
};

const getAcademyUserById = async (id) => {
  const member = await prisma.academy_user.findUnique({
    where: { user_academy_id: Number(id) },
    include: { user: { select: { id: true, Name: true, Email: true } }, organization: true },
  });
  if (!member) throw new AppError('Academy user not found', 404);
  return member;
};

export { getAcademyUsersByOrg, getAcademyUserById };
