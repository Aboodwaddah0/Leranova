import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { hashPassword } from '../utils/hashPassword.js';

const teacherSelect = {
  Teacher_id: true,
  OrgId: true,
  Work: true,
  specialization: true,
  bio: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      gender: true,
      age: true,
      address: true,
    },
  },
};

const serializeTeacher = (teacher) => ({
  id: teacher.Teacher_id,
  userId: teacher.Teacher_id,
  organizationId: teacher.OrgId,
  work: teacher.Work,
  specialization: teacher.specialization,
  bio: teacher.bio,
  createdAt: teacher.createdAt,
  user: teacher.user,
});

const ensureTeacherBelongsToOrg = async (orgId, teacherId) => {
  const teacher = await prisma.teacher.findFirst({
    where: { Teacher_id: teacherId, OrgId: orgId },
    select: teacherSelect,
  });

  if (!teacher) {
    throw new AppError('Teacher not found or does not belong to your organization', 404);
  }

  return teacher;
};

export const createTeacher = async (orgId, data) => {
  const existingEmail = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existingEmail) {
    throw new AppError('User email already exists', 409);
  }

  const passwordHashed = await hashPassword(data.password);

  const teacher = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        OrgId: orgId,
        name: data.name,
        email: data.email,
        passwordHashed,
        role: 'TEACHER',
        age: data.age ?? null,
        gender: data.gender ?? null,
        address: data.address ?? null,
      },
    });

    return tx.teacher.create({
      data: {
        Teacher_id: user.id,
        OrgId: orgId,
        Work: data.work ?? null,
        specialization: data.specialization ?? null,
        bio: data.bio ?? null,
      },
      select: teacherSelect,
    });
  });

  return serializeTeacher(teacher);
};

export const getTeachers = async (orgId) => {
  const teachers = await prisma.teacher.findMany({
    where: { OrgId: orgId },
    select: teacherSelect,
    orderBy: { Teacher_id: 'asc' },
  });

  return teachers.map(serializeTeacher);
};

export const getTeacherById = async (orgId, teacherId) => {
  const teacher = await ensureTeacherBelongsToOrg(orgId, teacherId);
  return serializeTeacher(teacher);
};

export const updateTeacher = async (orgId, teacherId, data) => {
  await ensureTeacherBelongsToOrg(orgId, teacherId);

  const teacher = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: teacherId },
      data: {
        age: data.age ?? undefined,
        gender: data.gender ?? undefined,
        address: data.address ?? undefined,
      },
    });

    return tx.teacher.update({
      where: { Teacher_id: teacherId },
      data: {
        Work: data.work ?? undefined,
        specialization: data.specialization ?? undefined,
        bio: data.bio ?? undefined,
      },
      select: teacherSelect,
    });
  });

  return serializeTeacher(teacher);
};

export const deleteTeacher = async (orgId, teacherId) => {
  await ensureTeacherBelongsToOrg(orgId, teacherId);

  await prisma.user.delete({ where: { id: teacherId } });

  return { id: teacherId };
};

export const getTeacherSubjects = async (orgId, teacherId) => {
  await ensureTeacherBelongsToOrg(orgId, teacherId);

  return prisma.subject.findMany({
    where: { Teacher_id: teacherId, course: { Org_id: orgId } },
    include: {
      course: { select: { id: true, Name: true } },
    },
    orderBy: { id: 'asc' },
  });
};

export const getTeacherLessons = async (orgId, teacherId) => {
  await ensureTeacherBelongsToOrg(orgId, teacherId);

  return prisma.lesson.findMany({
    where: {
      subject: { Teacher_id: teacherId, course: { Org_id: orgId } },
    },
    include: {
      subject: { select: { id: true, name: true } },
    },
    orderBy: { id: 'asc' },
  });
};
