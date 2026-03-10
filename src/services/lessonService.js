import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getAllLessons = async () => {
  return prisma.lesson.findMany({ include: { subject: { select: { id: true, name: true } } } });
};

const getLessonById = async (id) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: Number(id) },
    include: { subject: true, lesson_assets: true, comment: true },
  });
  if (!lesson) throw new AppError('Lesson not found', 404);
  return lesson;
};

const createLesson = async (data) => {
  return prisma.lesson.create({ data });
};

const updateLesson = async (id, data) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: Number(id) } });
  if (!lesson) throw new AppError('Lesson not found', 404);
  return prisma.lesson.update({ where: { id: Number(id) }, data });
};

const deleteLesson = async (id) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: Number(id) } });
  if (!lesson) throw new AppError('Lesson not found', 404);
  await prisma.lesson.delete({ where: { id: Number(id) } });
};

export { getAllLessons, getLessonById, createLesson, updateLesson, deleteLesson };
