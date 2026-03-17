import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const ensureCourseBelongsToOrg = async (orgId, courseId) => {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      Org_id: orgId,
    },
  });

  if (!course) {
    throw new AppError(
      'Course not found or does not belong to your organization',
      404
    );
  }

  return course;
};

const ensureTeacherBelongsToOrg = async (orgId, teacherId) => {
  const teacher = await prisma.teacher.findFirst({
    where: {
      Teacher_id: teacherId,
      OrgId: orgId,
    },
  });

  if (!teacher) {
    throw new AppError('Teacher not found or does not belong to your organization', 404);
  }

  return teacher;
};

export const createSubject = async (orgId, courseId, data) => {
  await ensureCourseBelongsToOrg(orgId, courseId);
  await ensureTeacherBelongsToOrg(orgId, data.Teacher_id);

  const subject = await prisma.subject.create({
    data: {
      Course_id: courseId,
      Teacher_id: data.Teacher_id,
      name: data.name,
      Description: data.Description ?? null,
    },
  });

  return subject;
};

export const getSubjects = async (orgId, courseId) => {
  await ensureCourseBelongsToOrg(orgId, courseId);

  const subjects = await prisma.subject.findMany({
    where: {
      Course_id: courseId,
      course: {
        Org_id: orgId,
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  return subjects;
};

export const getSubjectById = async (orgId, courseId, subjectId) => {
  if (courseId) {
    await ensureCourseBelongsToOrg(orgId, courseId);
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      ...(courseId ? { Course_id: courseId } : {}),
      course: {
        Org_id: orgId,
      },
    },
  });

  if (!subject) {
    throw new AppError('Subject not found or does not belong to this course', 404);
  }

  return subject;
};

export const updateSubject = async (orgId, courseId, subjectId, data) => {
  const existing = await getSubjectById(orgId, courseId, subjectId);

  if (data.Teacher_id && data.Teacher_id !== existing.Teacher_id) {
    await ensureTeacherBelongsToOrg(orgId, data.Teacher_id);
  }

  const updated = await prisma.subject.update({
    where: {
      id: subjectId,
    },
    data: {
      Course_id: courseId ?? existing.Course_id,
      Teacher_id: data.Teacher_id ?? undefined,
      name: data.name ?? undefined,
      Description: data.Description ?? undefined,
    },
  });

  return updated;
};

export const deleteSubject = async (orgId, courseId, subjectId) => {
  await getSubjectById(orgId, courseId, subjectId);

  await prisma.subject.delete({
    where: {
      id: subjectId,
    },
  });

  return { id: subjectId };
};
