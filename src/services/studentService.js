import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getAllStudents = async () => {
  return prisma.student.findMany({
    include: { user: { select: { id: true, Name: true, Email: true } }, organization: { select: { id: true, Name: true } } },
  });
};

const getStudentById = async (id) => {
  const student = await prisma.student.findUnique({
    where: { Student_id: Number(id) },
    include: { user: { select: { id: true, Name: true, Email: true } }, course: true, parent: true },
  });
  if (!student) throw new AppError('Student not found', 404);
  return student;
};

export { getAllStudents, getStudentById };
