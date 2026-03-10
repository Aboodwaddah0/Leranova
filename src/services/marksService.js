import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getMarksByUser = async (userId) => {
  return prisma.marks.findMany({
    where: { User_id: Number(userId) },
    include: { subject: { select: { id: true, name: true } } },
  });
};

const createMark = async (data) => {
  return prisma.marks.create({ data });
};

const updateMark = async (id, data) => {
  const mark = await prisma.marks.findUnique({ where: { id: Number(id) } });
  if (!mark) throw new AppError('Mark not found', 404);
  return prisma.marks.update({ where: { id: Number(id) }, data });
};

const deleteMark = async (id) => {
  const mark = await prisma.marks.findUnique({ where: { id: Number(id) } });
  if (!mark) throw new AppError('Mark not found', 404);
  await prisma.marks.delete({ where: { id: Number(id) } });
};

export { getMarksByUser, createMark, updateMark, deleteMark };
