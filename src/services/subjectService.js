import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getAllSubjects = async () => {
  return prisma.subject.findMany({ include: { course: { select: { id: true, Name: true } }, teacher: true } });
};

const getSubjectById = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id: Number(id) },
    include: { course: true, teacher: true, lesson: true },
  });
  if (!subject) throw new AppError('Subject not found', 404);
  return subject;
};

const createSubject = async (data) => {
  return prisma.subject.create({ data });
};

const updateSubject = async (id, data) => {
  const subject = await prisma.subject.findUnique({ where: { id: Number(id) } });
  if (!subject) throw new AppError('Subject not found', 404);
  return prisma.subject.update({ where: { id: Number(id) }, data });
};

const deleteSubject = async (id) => {
  const subject = await prisma.subject.findUnique({ where: { id: Number(id) } });
  if (!subject) throw new AppError('Subject not found', 404);
  await prisma.subject.delete({ where: { id: Number(id) } });
};

export { getAllSubjects, getSubjectById, createSubject, updateSubject, deleteSubject };
