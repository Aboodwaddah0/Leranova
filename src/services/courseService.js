import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { getGradeCourseName } from './gradePlacementService.js';
import { ensureCourseChatForCourse } from './chatService.js';

export const createCourse = async (orgId, data) => {
  const course = await prisma.$transaction(async (tx) => {
    const createdCourse = await tx.course.create({
      data: {
        Org_id: orgId,
        Name: data.Name,
        Description: data.Description ?? null,
        Thumbnail: data.Thumbnail ?? null,
        Start: data.Start ? new Date(data.Start) : null,
        End: data.End ? new Date(data.End) : null,
      },
    });

    const courseChat = await ensureCourseChatForCourse({
      tx,
      organizationId: orgId,
      courseId: createdCourse.id,
      title: `${createdCourse.Name} Course Chat`,
    });

    return {
      ...createdCourse,
      chat: {
        id: courseChat.id,
        course_id: courseChat.course_id,
        type: String(courseChat.type || '').toLowerCase(),
        title: courseChat.title,
        created_at: courseChat.created_at,
      },
    };
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

export const ensureCourseForGradeLevel = async (orgId, gradeLevel, tx = prisma) => {
  const existingByGrade = await tx.course.findFirst({
    where: {
      Org_id: orgId,
      GradeLevel: gradeLevel,
    },
    orderBy: { id: 'asc' },
  });

  if (existingByGrade) {
    await ensureCourseChatForCourse({
      tx,
      organizationId: orgId,
      courseId: existingByGrade.id,
      title: `${existingByGrade.Name} Course Chat`,
    });

    return existingByGrade;
  }

  const courseName = getGradeCourseName(gradeLevel);

  const existingByName = await tx.course.findFirst({
    where: {
      Org_id: orgId,
      Name: courseName,
    },
    orderBy: { id: 'asc' },
  });

  if (existingByName) {
    if (!existingByName.GradeLevel) {
      const updatedCourse = await tx.course.update({
        where: { id: existingByName.id },
        data: { GradeLevel: gradeLevel },
      });

      await ensureCourseChatForCourse({
        tx,
        organizationId: orgId,
        courseId: updatedCourse.id,
        title: `${updatedCourse.Name} Course Chat`,
      });

      return updatedCourse;
    }

    await ensureCourseChatForCourse({
      tx,
      organizationId: orgId,
      courseId: existingByName.id,
      title: `${existingByName.Name} Course Chat`,
    });

    return existingByName;
  }

  const createdCourse = await tx.course.create({
    data: {
      Org_id: orgId,
      Name: courseName,
      GradeLevel: gradeLevel,
      Description: `Auto-created grade course for level ${gradeLevel}`,
    },
  });

  await ensureCourseChatForCourse({
    tx,
    organizationId: orgId,
    courseId: createdCourse.id,
    title: `${createdCourse.Name} Course Chat`,
  });

  return createdCourse;
};
