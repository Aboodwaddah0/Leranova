import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const toRole = (value) => String(value || '').trim().toUpperCase();

const resolveAccessScope = async (actor) => {
  const role = toRole(actor?.role);

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: actor.id },
      select: { Teacher_id: true, OrgId: true },
    });

    if (!teacher) {
      throw new AppError('Teacher profile not found', 404);
    }

    return {
      role,
      orgId: teacher.OrgId,
      teacherId: teacher.Teacher_id,
    };
  }

  if (role === 'ACADEMY' || role === 'SCHOOL') {
    return {
      role,
      orgId: actor.id,
      teacherId: null,
    };
  }

  if (role === 'STUDENT') {
    const student = await prisma.academy_user.findFirst({
      where: { user_academy_id: actor.id },
      select: { OrgId: true },
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    return {
      role,
      orgId: student.OrgId,
      teacherId: null, // Students can see all subjects
    };
  }

  throw new AppError('Access denied. Teacher, student, or organization account required.', 403);
};

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

export const createSubject = async (actor, courseId, data) => {
  const scope = await resolveAccessScope(actor);
  await ensureCourseBelongsToOrg(scope.orgId, courseId);

  const teacherId = scope.role === 'TEACHER' ? scope.teacherId : data.Teacher_id;

  if (!teacherId) {
    throw new AppError('Teacher_id is required for organization subject creation', 400);
  }

  await ensureTeacherBelongsToOrg(scope.orgId, teacherId);

  const subject = await prisma.subject.create({
    data: {
      Course_id: courseId,
      Teacher_id: teacherId,
      name: data.name,
      Description: data.Description ?? null,
    },
  });

  return subject;
};

export const getSubjects = async (actor, courseId) => {
  const scope = await resolveAccessScope(actor);
  await ensureCourseBelongsToOrg(scope.orgId, courseId);

  const subjects = await prisma.subject.findMany({
    where: {
      Course_id: courseId,
      ...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
      course: {
        Org_id: scope.orgId,
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  return subjects;
};

export const getSubjectById = async (actor, courseId, subjectId) => {
  const scope = await resolveAccessScope(actor);
  await ensureCourseBelongsToOrg(scope.orgId, courseId);

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      Course_id: courseId,
      ...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
      course: {
        Org_id: scope.orgId,
      },
    },
  });

  if (!subject) {
    throw new AppError('Subject not found or does not belong to this course', 404);
  }

  return subject;
};

export const updateSubject = async (actor, courseId, subjectId, data) => {
  const scope = await resolveAccessScope(actor);
  const existing = await getSubjectById(actor, courseId, subjectId);

  const requestedTeacherId = data.Teacher_id;

  if (scope.role === 'TEACHER') {
    if (requestedTeacherId && Number(requestedTeacherId) !== Number(scope.teacherId)) {
      throw new AppError('Teachers can only assign subjects to themselves', 403);
    }
  }

  if (requestedTeacherId && requestedTeacherId !== existing.Teacher_id) {
    await ensureTeacherBelongsToOrg(scope.orgId, requestedTeacherId);
  }

  const updated = await prisma.subject.update({
    where: {
      id: subjectId,
    },
    data: {
      Course_id: existing.Course_id,
      Teacher_id: scope.role === 'TEACHER'
        ? scope.teacherId
        : (requestedTeacherId ?? undefined),
      name: data.name ?? undefined,
      Description: data.Description ?? undefined,
    },
  });

  return updated;
};

export const deleteSubject = async (actor, courseId, subjectId) => {
  await getSubjectById(actor, courseId, subjectId);

  await prisma.subject.delete({
    where: {
      id: subjectId,
    },
  });

  return { id: subjectId };
};
