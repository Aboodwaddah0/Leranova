import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { resolveStudentContext } from './studentExperienceService.js';

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
    const context = await resolveStudentContext(actor.id);

    return {
      role,
      orgId: context.orgId,
      teacherId: null,
      userId: actor.id,
      studentMode: context.mode,
      classCourseId: context.mode === 'SCHOOL' ? context.classCourseId : null,
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

const ensureSubjectPaymentRules = async (courseId, data = {}) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      organization: {
        select: {
          Role: true,
        },
      },
    },
  });

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  const orgRole = toRole(course.organization?.Role);
  const isPaid = data.isPaid === undefined ? undefined : Boolean(data.isPaid);
  const price = data.price === undefined ? undefined : Number(data.price);

  if (orgRole === 'SCHOOL') {
    if (isPaid === true || (price !== undefined && price > 0)) {
      throw new AppError('School class subjects must be free', 400);
    }
  }

  if (isPaid === true && Number(price ?? 0) <= 0) {
    throw new AppError('Paid subjects must have a price greater than 0', 400);
  }
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
  if (scope.role === 'STUDENT') {
    throw new AppError('Students cannot create subjects', 403);
  }
  await ensureCourseBelongsToOrg(scope.orgId, courseId);
  await ensureSubjectPaymentRules(courseId, data);

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
      isPaid: Boolean(data.isPaid),
      price: data.isPaid ? Number(data.price ?? 0) : 0,
      imageUrl: data.imageUrl ?? '',
      Description: data.Description ?? null,
    },
  });

  return subject;
};

export const getSubjects = async (actor, courseId) => {
  const scope = await resolveAccessScope(actor);
  await ensureCourseBelongsToOrg(scope.orgId, courseId);

  if (scope.role === 'STUDENT' && scope.studentMode === 'SCHOOL') {
    if (Number(courseId) !== Number(scope.classCourseId)) {
      throw new AppError('School student can only access subjects of the assigned class', 403);
    }
  }

  const subjects = await prisma.subject.findMany({
    where: {
      Course_id: courseId,
      ...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
      ...(scope.role === 'STUDENT' && scope.studentMode === 'ACADEMY'
        ? {
            subscriptions: {
              some: {
                user_Academy_id: scope.userId,
                OR: [
                  { paymentStatus: 'PAID' },
                  { status: 'PAID' },
                  { status: 'SUCCESS' },
                ],
              },
            },
          }
        : {}),
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

  if (scope.role === 'STUDENT' && scope.studentMode === 'SCHOOL') {
    if (Number(courseId) !== Number(scope.classCourseId)) {
      throw new AppError('School student can only access subjects of the assigned class', 403);
    }
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      Course_id: courseId,
      ...(scope.teacherId ? { Teacher_id: scope.teacherId } : {}),
      ...(scope.role === 'STUDENT' && scope.studentMode === 'ACADEMY'
        ? {
            subscriptions: {
              some: {
                user_Academy_id: scope.userId,
                OR: [
                  { paymentStatus: 'PAID' },
                  { status: 'PAID' },
                  { status: 'SUCCESS' },
                ],
              },
            },
          }
        : {}),
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
  if (scope.role === 'STUDENT') {
    throw new AppError('Students cannot update subjects', 403);
  }
  await ensureSubjectPaymentRules(courseId, data);
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
      isPaid: data.isPaid ?? undefined,
      price: data.isPaid === false ? 0 : (data.price ?? undefined),
      imageUrl: data.imageUrl ?? undefined,
      Description: data.Description ?? undefined,
    },
  });

  return updated;
};

export const deleteSubject = async (actor, courseId, subjectId) => {
  const scope = await resolveAccessScope(actor);
  if (scope.role === 'STUDENT') {
    throw new AppError('Students cannot delete subjects', 403);
  }

  await getSubjectById(actor, courseId, subjectId);

  await prisma.subject.delete({
    where: {
      id: subjectId,
    },
  });

  return { id: subjectId };
};
