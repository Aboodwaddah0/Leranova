import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { getGradeCourseName } from './gradePlacementService.js';
import { ensureCourseChatForCourse } from './chatService.js';

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

const ensureTeacherBelongsToOrg = async (orgId, teacherId) => {
  if (teacherId === undefined || teacherId === null || teacherId === '') {
    return null;
  }

  const numericTeacherId = Number(teacherId);
  if (!Number.isInteger(numericTeacherId) || numericTeacherId <= 0) {
    throw new AppError('Invalid teacher id', 400);
  }

  const teacher = await prisma.teacher.findFirst({
    where: {
      Teacher_id: numericTeacherId,
      OrgId: orgId,
    },
    select: { Teacher_id: true },
  });

  if (!teacher) {
    throw new AppError('Teacher not found or does not belong to your organization', 404);
  }

  return numericTeacherId;
};

const normalizeCourseTeacherId = (data) => data?.Teacher_id ?? data?.teacherId;


export const createCourse = async (orgId, data) => {
  const payload = data && typeof data === 'object' ? data : {};

  if (!String(payload.Name || '').trim()) {
    throw new AppError(
      'Course name is required. | اسم المساق مطلوب.',
      400
    );
  }

  const organizationRole = await getOrganizationRole(orgId);
  const teacherId = await ensureTeacherBelongsToOrg(orgId, normalizeCourseTeacherId(payload));
  const resolvedTeacherId = organizationRole === 'SCHOOL' ? null : teacherId;

  // Courses are always free — payment is at the subject level for academy
  const course = await prisma.$transaction(async (tx) => {
    const createdCourse = await tx.track.create({
      data: {
        Org_id: orgId,
        Teacher_id: resolvedTeacherId,
        Name: payload.Name,
        kind: organizationRole === 'SCHOOL' ? 'CLASS' : 'TRACK',
        Description: payload.Description ?? null,
        Thumbnail: payload.Thumbnail ?? null,
        price: 0,
        isPaid: false,
        level: organizationRole === 'ACADEMY' ? (payload.level || null) : null,
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
  const organizationRole = await getOrganizationRole(orgId);

  if (organizationRole === 'ACADEMY') {
    return prisma.track.findMany({
      where: { Org_id: orgId },
      orderBy: { id: 'asc' },
      include: {
        teacher: {
          select: { Teacher_id: true, user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  // SCHOOL: teacher is per-subject, not per-course
  const courses = await prisma.track.findMany({
    where: { Org_id: orgId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      Org_id: true,
      Teacher_id: true,
      Name: true,
      kind: true,
      GradeLevel: true,
      Description: true,
      Thumbnail: true,
      price: true,
      isPaid: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return courses.map((c) => ({ ...c, teacher: null }));
};

export const getCourseById = async (orgId, courseId) => {
  const organizationRole = await getOrganizationRole(orgId);
  const notFoundError = new AppError(
    `Course (ID: ${courseId}) not found or does not belong to your organization. Make sure the course exists and is part of your organization. | المساق (معرف: ${courseId}) غير موجود أو لا ينتمي إلى مؤسستك. تأكد من وجود المساق وأنة جزء من مؤسستك.`,
    404
  );

  if (organizationRole === 'ACADEMY') {
    const course = await prisma.track.findFirst({
      where: { id: courseId, Org_id: orgId },
      include: {
        teacher: {
          select: { Teacher_id: true, user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!course) throw notFoundError;
    return course;
  }

  // SCHOOL: teacher is per-subject
  const course = await prisma.track.findFirst({
    where: { id: courseId, Org_id: orgId },
    select: {
      id: true,
      Org_id: true,
      Teacher_id: true,
      Name: true,
      kind: true,
      GradeLevel: true,
      Description: true,
      Thumbnail: true,
      price: true,
      isPaid: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!course) throw notFoundError;
  return { ...course, teacher: null };
};

export const updateCourse = async (orgId, courseId, data) => {
  const organizationRole = await getOrganizationRole(orgId);
  await getCourseById(orgId, courseId);

  // Courses are always free — payment is at the subject level for academy
  const updated = await prisma.track.update({
    where: {
      id: courseId,
    },
    data: {
      Name: data.Name,
      kind: organizationRole === 'SCHOOL' ? 'CLASS' : 'TRACK',
      Description: data.Description ?? undefined,
      Thumbnail: data.Thumbnail ?? undefined,
      isPaid: false,
      price: 0,
      ...(organizationRole === 'ACADEMY' && Object.prototype.hasOwnProperty.call(data, 'level')
        ? { level: data.level || null }
        : {}),
    },
  });

  return updated;
};

export const deleteCourse = async (orgId, courseId) => {
  await getCourseById(orgId, courseId);

  await prisma.track.delete({
    where: {
      id: courseId,
    },
  });

  return { id: courseId };
};

export const ensureCourseForGradeLevel = async (orgId, gradeLevel, tx = prisma) => {
  const existingByGrade = await tx.track.findFirst({
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

  const existingByName = await tx.track.findFirst({
    where: {
      Org_id: orgId,
      Name: courseName,
    },
    orderBy: { id: 'asc' },
  });

  if (existingByName) {
    if (!existingByName.GradeLevel) {
      const updatedCourse = await tx.track.update({
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

  const createdCourse = await tx.track.create({
    data: {
      Org_id: orgId,
      Name: courseName,
      kind: 'CLASS',
      GradeLevel: gradeLevel,
      Description: `Auto-created grade course for level ${gradeLevel}`,
      price: 0,
      isPaid: false,
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
