import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const resolveOrgId = async (user) => {
  const role = String(user?.role ?? '').trim().toUpperCase();
  if (role === 'SCHOOL' || role === 'ACADEMY') return user.id;
  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: user.id },
      select: { OrgId: true },
    });
    if (!teacher) throw new AppError('Teacher not found', 404);
    return teacher.OrgId;
  }
  throw new AppError('Access denied', 403);
};

const toDto = (a) => ({
  id: a.id,
  studentId: a.studentId,
  classId: a.classId,
  orgId: a.orgId,
  date: a.date,
  status: a.status,
  markedBy: a.markedBy,
  note: a.note ?? null,
  createdAt: a.createdAt,
  student: a.student
    ? { id: a.student.Student_id, name: a.student.user?.name ?? null, email: a.student.user?.email ?? null }
    : undefined,
});

export const getClassStudents = async (user, classId) => {
  const orgId = await resolveOrgId(user);

  const cls = await prisma.track.findFirst({
    where: { id: classId, OrgId: orgId },
  });
  if (!cls) throw new AppError('Class not found', 404);

  const students = await prisma.student.findMany({
    where: { Course_id: classId, OrgId: orgId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { user: { name: 'asc' } },
  });

  return students.map((s) => ({
    id: s.Student_id,
    name: s.user?.name ?? null,
    email: s.user?.email ?? null,
    gradeLevel: s.GradeLevel,
  }));
};

export const markAttendance = async (user, classId, { date, records }) => {
  const orgId = await resolveOrgId(user);

  const cls = await prisma.track.findFirst({
    where: { id: classId, OrgId: orgId },
  });
  if (!cls) throw new AppError('Class not found', 404);

  const parsedDate = new Date(date);
  const markedBy = user.id;

  const results = await Promise.all(
    records.map(({ studentId, status, note }) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId, date: parsedDate } },
        create: { studentId, classId, orgId, date: parsedDate, status: status || 'PRESENT', markedBy, note: note || null },
        update: { status: status || 'PRESENT', markedBy, note: note || null, classId },
      })
    )
  );

  return results.map(toDto);
};

export const getClassAttendance = async (user, classId, { date } = {}) => {
  const orgId = await resolveOrgId(user);

  const cls = await prisma.track.findFirst({
    where: { id: classId, OrgId: orgId },
  });
  if (!cls) throw new AppError('Class not found', 404);

  const records = await prisma.attendance.findMany({
    where: {
      classId,
      orgId,
      ...(date ? { date: new Date(date) } : {}),
    },
    include: {
      student: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: [{ date: 'desc' }],
  });

  return records.map(toDto);
};

export const getStudentAttendance = async (user, studentId, { from, to } = {}) => {
  const orgId = await resolveOrgId(user);

  const records = await prisma.attendance.findMany({
    where: {
      studentId,
      orgId,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: 'desc' },
  });

  return records.map(toDto);
};
