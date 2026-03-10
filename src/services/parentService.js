import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getParentById = async (id) => {
  const parent = await prisma.parent.findUnique({
    where: { Parent_id: Number(id) },
    include: { user: { select: { id: true, Name: true, Email: true } }, student: true },
  });
  if (!parent) throw new AppError('Parent not found', 404);
  return parent;
};

export { getParentById };
