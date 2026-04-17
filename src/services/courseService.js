import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { getGradeCourseName } from './gradePlacementService.js';

const getOrganizationRole = async (orgId) => {
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { Role: true },
  });

  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  return String(organization.Role || '').trim().toUpperCase();
};

export const createCourse = async (orgId, data) => {
  const organizationRole = await getOrganizationRole(orgId);
  const isPaid = Boolean(data.isPaid);
  const price = isPaid ? Number(data.price ?? 0) : 0;

  if (organizationRole === 'SCHOOL' && (isPaid || price > 0)) {
    throw new AppError('School courses must be free', 400);
  }

  if (isPaid && price <= 0) {
    throw new AppError('Paid courses must have a price greater than 0', 400);
  }

  const course = await prisma.course.create({
    data: {
      Org_id: orgId,
      Name: data.Name,
      Description: data.Description ?? null,
      Thumbnail: data.Thumbnail ?? null,
      Start: data.Start ? new Date(data.Start) : null,
      End: data.End ? new Date(data.End) : null,
      price,
      isPaid,
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
  const organizationRole = await getOrganizationRole(orgId);
  await getCourseById(orgId, courseId);

  const hasPrice = Object.prototype.hasOwnProperty.call(data, 'price');
  const hasIsPaid = Object.prototype.hasOwnProperty.call(data, 'isPaid');
  const isPaid = hasIsPaid ? Boolean(data.isPaid) : undefined;
  const price = hasPrice ? Number(data.price ?? 0) : undefined;

  if (
    organizationRole === 'SCHOOL' &&
    ((hasIsPaid && isPaid === true) || (hasPrice && Number(price) > 0))
  ) {
    throw new AppError('School courses must be free', 400);
  }

  if (isPaid === true && Number(price ?? 0) <= 0) {
    throw new AppError('Paid courses must have a price greater than 0', 400);
  }

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
      isPaid,
      price: isPaid === false ? 0 : price,
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
      return tx.course.update({
        where: { id: existingByName.id },
        data: { GradeLevel: gradeLevel },
      });
    }

    return existingByName;
  }

  return tx.course.create({
    data: {
      Org_id: orgId,
      Name: courseName,
      GradeLevel: gradeLevel,
      Description: `Auto-created grade course for level ${gradeLevel}`,
      price: 0,
      isPaid: false,
    },
  });
};
