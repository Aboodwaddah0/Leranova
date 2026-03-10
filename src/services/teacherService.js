import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getAllTeachers = async () => {
  return prisma.teacher.findMany({
    include: { user: { select: { id: true, Name: true, Email: true } } },
  });
};

const getTeacherById = async (id) => {
  const teacher = await prisma.teacher.findUnique({
    where: { Teacher_id: Number(id) },
    include: { user: { select: { id: true, Name: true, Email: true } }, subject: true },
  });
  if (!teacher) throw new AppError('Teacher not found', 404);
  return teacher;
};

export { getAllTeachers, getTeacherById };
