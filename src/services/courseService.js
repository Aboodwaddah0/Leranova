import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

export const createCourse = async (orgId, data) => {
  const course = await prisma.course.create({
    data: {
      Org_id: orgId,
      Name: data.Name,
      Description: data.Description ?? null,
      Thumbnail: data.Thumbnail ?? null,
      Start: data.Start ? new Date(data.Start) : null,
      End: data.End ? new Date(data.End) : null,
    },
  });

  return course;
};

export const getCourses = async (orgId) => {
  const courses = await prisma.course.findMany({
    where: {
      Org_id: orgId,
    },
    orderBy: {
      id: 'asc',
    },
  });

  return courses;
};

export const getCourseById = async (orgId, courseId) => {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      Org_id: orgId,
    },
  });

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  return course;
};

export const updateCourse = async (orgId, courseId, data) => {
  await getCourseById(orgId, courseId);

  const updated = await prisma.course.update({
    where: {
      id: courseId,
    },
    data: {
      Name: data.Name,
      Description: data.Description ?? undefined,
      Thumbnail: data.Thumbnail ?? undefined,
      Start: data.Start ? new Date(data.Start) : undefined,
      End: data.End ? new Date(data.End) : undefined,
    },
  });

  return updated;
};

export const deleteCourse = async (orgId, courseId) => {
  await getCourseById(orgId, courseId);

  await prisma.course.delete({
    where: {
      id: courseId,
    },
  });

  return { id: courseId };
};
