import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { hashPassword } from '../utils/hashPassword.js';
import { encryptPassword } from '../utils/passwordCrypto.js';

const toRole = (v) => String(v || '').trim().toUpperCase();

const resolveTeacherScope = async (actor) => {
  const role = toRole(actor?.role);

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: actor.id },
      select: { Teacher_id: true, OrgId: true },
    });
    if (!teacher) throw new AppError('Teacher profile not found', 404);
    return { role, orgId: teacher.OrgId, teacherId: teacher.Teacher_id };
  }

  if (role === 'SCHOOL') {
    return { role, orgId: actor.id, teacherId: null };
  }

  if (role === 'PARENT') {
    return { role, orgId: null, teacherId: null };
  }

  throw new AppError('Access denied', 403);
};

const ensureSchoolOrg = async (orgId) => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { Role: true },
  });
  if (!org) throw new AppError('Organization not found', 404);
  if (org.Role !== 'SCHOOL') throw new AppError('Notes are only available for school organizations', 403);
};

const ensureStudentBelongsToOrg = async (orgId, studentId) => {
  const student = await prisma.student.findFirst({
    where: { Student_id: studentId, OrgId: orgId },
    select: { Student_id: true, user: { select: { id: true, name: true } } },
  });
  if (!student) throw new AppError('Student not found or does not belong to your organization', 404);
  return student;
};

export const createNote = async (actor, { studentId, title, content }) => {
  const scope = await resolveTeacherScope(actor);
  if (scope.role !== 'TEACHER') throw new AppError('Only teachers can create notes', 403);

  await ensureSchoolOrg(scope.orgId);
  await ensureStudentBelongsToOrg(scope.orgId, studentId);

  const note = await prisma.student_note.create({
    data: {
      studentId,
      teacherId: scope.teacherId,
      orgId: scope.orgId,
      title: title || null,
      content,
    },
    include: {
      teacher: { select: { user: { select: { id: true, name: true } } } },
    },
  });

  return note;
};

export const getNotesForStudent = async (actor, studentId) => {
  const scope = await resolveTeacherScope(actor);
  if (scope.role !== 'TEACHER' && scope.role !== 'SCHOOL') {
    throw new AppError('Access denied', 403);
  }

  await ensureSchoolOrg(scope.orgId);
  await ensureStudentBelongsToOrg(scope.orgId, studentId);

  const where = {
    studentId,
    orgId: scope.orgId,
    ...(scope.role === 'TEACHER' ? { teacherId: scope.teacherId } : {}),
  };

  const notes = await prisma.student_note.findMany({
    where,
    include: {
      teacher: { select: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return notes;
};

export const deleteNote = async (actor, noteId) => {
  const scope = await resolveTeacherScope(actor);
  if (scope.role !== 'TEACHER') throw new AppError('Only teachers can delete notes', 403);

  const note = await prisma.student_note.findFirst({
    where: { id: noteId, teacherId: scope.teacherId },
  });
  if (!note) throw new AppError('Note not found or you do not have permission to delete it', 404);

  await prisma.student_note.delete({ where: { id: noteId } });
  return { id: noteId };
};

export const getNotesForParent = async (parentUserId) => {
  const linkedStudents = await prisma.student.findMany({
    where: { Parent_id: parentUserId },
    select: {
      Student_id: true,
      GradeLevel: true,
      AcademicStatus: true,
      user: { select: { id: true, name: true } },
      student_notes: {
        include: {
          teacher: { select: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return linkedStudents.map((s) => ({
    studentId: s.Student_id,
    studentName: s.user?.name || '',
    gradeLevel: s.GradeLevel,
    academicStatus: s.AcademicStatus,
    notes: s.student_notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      isRead: n.isRead,
      teacherName: n.teacher?.user?.name || '',
      createdAt: n.createdAt,
    })),
    unreadCount: s.student_notes.filter((n) => !n.isRead).length,
  }));
};

export const getChildrenForParent = async (parentUserId) => {
  const students = await prisma.student.findMany({
    where: { Parent_id: parentUserId },
    select: {
      Student_id: true,
      GradeLevel: true,
      AcademicStatus: true,
      user: { select: { id: true, name: true, gender: true } },
    },
  });

  return students.map((s) => ({
    studentId: s.Student_id,
    name: s.user?.name || '',
    gender: s.user?.gender || null,
    gradeLevel: s.GradeLevel,
    academicStatus: s.AcademicStatus,
  }));
};

export const getMyParentProfile = async (parentUserId) => {
  const user = await prisma.user.findUnique({
    where: { id: parentUserId },
    select: { id: true, name: true, email: true, age: true, gender: true, address: true, role: true },
  });
  if (!user) throw new AppError('Parent not found', 404);
  return user;
};

export const updateMyParentProfile = async (parentUserId, data) => {
  const userData = {
    name:    data.name    ?? undefined,
    age:     data.age     ?? undefined,
    gender:  data.gender  ?? undefined,
    address: data.address ?? undefined,
  };

  if (data.password !== undefined) {
    userData.passwordHashed    = await hashPassword(data.password);
    userData.passwordEncrypted = encryptPassword(data.password);
  }

  await prisma.user.update({ where: { id: parentUserId }, data: userData });
  return getMyParentProfile(parentUserId);
};

export const markNoteRead = async (parentUserId, noteId) => {
  const linkedStudentIds = (
    await prisma.student.findMany({
      where: { Parent_id: parentUserId },
      select: { Student_id: true },
    })
  ).map((s) => s.Student_id);

  const note = await prisma.student_note.findFirst({
    where: { id: noteId, studentId: { in: linkedStudentIds } },
  });
  if (!note) throw new AppError('Note not found', 404);

  await prisma.student_note.update({ where: { id: noteId }, data: { isRead: true } });
  return { id: noteId, isRead: true };
};
