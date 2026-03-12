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

const ensureTeacherExists = async (teacherId) => {
  const teacher = await prisma.teacher.findUnique({
    where: {
      Teacher_id: teacherId,
    },
  });

  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  return teacher;
};

export const createSubject = async (orgId, data) => {
  await ensureCourseBelongsToOrg(orgId, data.Course_id);
  await ensureTeacherExists(data.Teacher_id);

  const subject = await prisma.subject.create({
    data: {
      Course_id: data.Course_id,
      Teacher_id: data.Teacher_id,
      name: data.name,
      Description: data.Description ?? null,
    },
  });

  return subject;
};

export const getSubjects = async (orgId, courseId) => {
  const where = {
    course: {
      Org_id: orgId,
    },
  };

  if (courseId) {
    where.Course_id = courseId;
  }

  const subjects = await prisma.subject.findMany({
    where,
    orderBy: {
      id: 'asc',
    },
  });

  return subjects;
};

export const getSubjectById = async (orgId, subjectId) => {
  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      course: {
        Org_id: orgId,
      },
    },
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  return subject;
};

export const updateSubject = async (orgId, subjectId, data) => {
  const existing = await getSubjectById(orgId, subjectId);

  if (data.Course_id && data.Course_id !== existing.Course_id) {
    await ensureCourseBelongsToOrg(orgId, data.Course_id);
  }

  if (data.Teacher_id && data.Teacher_id !== existing.Teacher_id) {
    await ensureTeacherExists(data.Teacher_id);
  }

  const updated = await prisma.subject.update({
    where: {
      id: subjectId,
    },
    data: {
      Course_id: data.Course_id ?? undefined,
      Teacher_id: data.Teacher_id ?? undefined,
      name: data.name ?? undefined,
      Description: data.Description ?? undefined,
    },
  });

  return updated;
};

export const deleteSubject = async (orgId, subjectId) => {
  await getSubjectById(orgId, subjectId);

  await prisma.subject.delete({
    where: {
      id: subjectId,
    },
  });

  return { id: subjectId };
};
