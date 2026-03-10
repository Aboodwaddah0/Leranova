import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getAllCourses = async () => {
  return prisma.course.findMany({ include: { organization: { select: { id: true, Name: true } } } });
};

const getCourseById = async (id) => {
  const course = await prisma.course.findUnique({
    where: { id: Number(id) },
    include: { subject: true, organization: { select: { id: true, Name: true } } },
  });
  if (!course) throw new AppError('Course not found', 404);
  return course;
};

const createCourse = async (data) => {
  return prisma.course.create({ data });
};

const updateCourse = async (id, data) => {
  const course = await prisma.course.findUnique({ where: { id: Number(id) } });
  if (!course) throw new AppError('Course not found', 404);
  return prisma.course.update({ where: { id: Number(id) }, data });
};

const deleteCourse = async (id) => {
  const course = await prisma.course.findUnique({ where: { id: Number(id) } });
  if (!course) throw new AppError('Course not found', 404);
  await prisma.course.delete({ where: { id: Number(id) } });
};

export { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse };
