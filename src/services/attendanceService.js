import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { createNotification } from './notificationService.js';

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
  subjectId: a.subjectId ?? null,
  orgId: a.orgId,
  academicYearId: a.academicYearId ?? null,
  date: a.date,
  status: a.status,
  markedBy: a.markedBy,
  note: a.note ?? null,
  createdAt: a.createdAt,
  student: a.student
    ? { id: a.student.Student_id, name: a.student.user?.name ?? null, email: a.student.user?.email ?? null }
    : undefined,
});

// Verify teacher owns the subject and return it with its class org info
const ensureTeacherOwnsSubject = async (teacherId, subjectId) => {
  const subject = await prisma.course.findFirst({
    where: { id: subjectId, Teacher_id: teacherId },
    include: { track: { select: { id: true, Org_id: true } } },
  });
  if (!subject) throw new AppError('Subject not found or not assigned to you', 403);
  return subject;
};

// Fire absent/late notifications for students (and their parents) — fire-and-forget
const notifyAbsentLate = async (records, date) => {
  const flagged = records.filter((r) => r.status === 'ABSENT' || r.status === 'LATE');
  if (!flagged.length) return;

  const students = await prisma.student.findMany({
    where: { Student_id: { in: flagged.map((r) => r.studentId) } },
    select: { Student_id: true, Parent_id: true, user: { select: { id: true, name: true } } },
  });

  const dateStr = new Date(date).toLocaleDateString('en-GB');

  students.forEach((student) => {
    const status = flagged.find((r) => r.studentId === student.Student_id)?.status;
    const label  = status === 'ABSENT' ? 'absent' : 'late';

    if (student.user?.id) {
      createNotification({
        userId: student.user.id,
        content: `You were marked ${label} on ${dateStr}`,
        type: 'ATTENDANCE',
        url: '/student/attendance',
      }).catch(() => {});
    }

    if (student.Parent_id) {
      createNotification({
        userId: student.Parent_id,
        content: `${student.user?.name ?? 'Your child'} was marked ${label} on ${dateStr}`,
        type: 'ATTENDANCE',
        url: '/dashboard/parent',
      }).catch(() => {});
    }
  });
};

const getActiveAcademicYearId = async (orgId) => {
  const year = await prisma.academic_year.findFirst({
    where: { OrgId: orgId, isActive: true },
    select: { id: true },
  });
  return year?.id ?? null;
};

export const getClassStudents = async (user, classId) => {
  const orgId = await resolveOrgId(user);

  const cls = await prisma.track.findFirst({
    where: { id: classId, Org_id: orgId },
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
  // Daily class attendance — org admin only
  const role = String(user?.role ?? '').trim().toUpperCase();
  if (role !== 'SCHOOL' && role !== 'ACADEMY') {
    throw new AppError('Only school administrators can mark daily attendance', 403);
  }
  const orgId = user.id;

  const cls = await prisma.track.findFirst({
    where: { id: classId, Org_id: orgId },
  });
  if (!cls) throw new AppError('Class not found', 404);

  const parsedDate = new Date(date);
  const academicYearId = await getActiveAcademicYearId(orgId);

  const results = await Promise.all(
    records.map(({ studentId, status, note }) =>
      prisma.attendance.upsert({
        where: { studentId_classId_date: { studentId, classId, date: parsedDate } },
        create: { studentId, classId, subjectId: null, orgId, academicYearId, date: parsedDate, status: status || 'PRESENT', markedBy: user.id, note: note || null },
        update: { status: status || 'PRESENT', markedBy: user.id, note: note || null },
      })
    )
  );

  notifyAbsentLate(records, parsedDate).catch(() => {});

  return results.map(toDto);
};

export const getClassAttendance = async (user, classId, { date, academicYearId, termId } = {}) => {
  const orgId = await resolveOrgId(user);

  const cls = await prisma.track.findFirst({
    where: { id: classId, Org_id: orgId },
  });
  if (!cls) throw new AppError('Class not found', 404);

  const yearId = academicYearId ? Number(academicYearId) : undefined;

  let dateFilter = {};
  if (date) {
    dateFilter = { date: new Date(date) };
  } else if (termId) {
    const term = await prisma.term.findUnique({ where: { id: Number(termId) } });
    if (term) {
      dateFilter = { date: { gte: term.startDate, lte: term.endDate } };
    }
  }

  const records = await prisma.attendance.findMany({
    where: {
      classId,
      orgId,
      ...dateFilter,
      ...(yearId ? { academicYearId: yearId } : {}),
    },
    include: {
      student: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: [{ date: 'desc' }],
  });

  return records.map(toDto);
};

export const getClassAttendanceSummary = async (user, classId, { academicYearId, termId } = {}) => {
  const orgId = await resolveOrgId(user);

  const cls = await prisma.track.findFirst({ where: { id: classId, Org_id: orgId } });
  if (!cls) throw new AppError('Class not found', 404);

  const yearId = academicYearId ? Number(academicYearId) : undefined;

  let dateFilter = {};
  if (termId) {
    const term = await prisma.term.findUnique({ where: { id: Number(termId) } });
    if (term) dateFilter = { date: { gte: term.startDate, lte: term.endDate } };
  }

  const [students, records] = await Promise.all([
    prisma.student.findMany({
      where: { Course_id: classId, OrgId: orgId },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: 'asc' } },
    }),
    prisma.attendance.findMany({
      where: { classId, orgId, ...dateFilter, ...(yearId ? { academicYearId: yearId } : {}) },
      select: { studentId: true, status: true },
    }),
  ]);

  const countMap = new Map();
  for (const r of records) {
    if (!countMap.has(r.studentId)) countMap.set(r.studentId, { present: 0, absent: 0, late: 0, excused: 0 });
    const cnt = countMap.get(r.studentId);
    const s = String(r.status ?? '').toUpperCase();
    if (s === 'PRESENT') cnt.present++;
    else if (s === 'ABSENT') cnt.absent++;
    else if (s === 'LATE') cnt.late++;
    else if (s === 'EXCUSED') cnt.excused++;
  }

  return students.map((s) => {
    const cnt = countMap.get(s.Student_id) ?? { present: 0, absent: 0, late: 0, excused: 0 };
    const total = cnt.present + cnt.absent + cnt.late + cnt.excused;
    const attended = cnt.present + cnt.late;
    return {
      studentId: s.Student_id,
      studentName: s.user?.name ?? '',
      present: cnt.present,
      absent: cnt.absent,
      late: cnt.late,
      excused: cnt.excused,
      total,
      percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
    };
  });
};

export const getStudentAttendance = async (user, studentId, { from, to, academicYearId } = {}) => {
  const orgId = await resolveOrgId(user);

  const yearId = academicYearId ? Number(academicYearId) : undefined;

  const records = await prisma.attendance.findMany({
    where: {
      studentId,
      orgId,
      ...(yearId ? { academicYearId: yearId } : {}),
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

// ── Student self-view + parent children view ──────────────────────────────

export const getMyStudentAttendance = async (studentId, { from, to, academicYearId } = {}) => {
  // Daily attendance — no subject filter needed
  const records = await prisma.attendance.findMany({
    where: {
      studentId,
      subjectId: null, // only daily records (no subject = daily class attendance)
      ...(academicYearId ? { academicYearId: Number(academicYearId) } : {}),
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    },
    orderBy: { date: 'desc' },
  });
  return records.map(toDto);
};

export const getChildrenAttendance = async (parentUserId, params = {}) => {
  const children = await prisma.student.findMany({
    where: { Parent_id: parentUserId },
    select: { Student_id: true, user: { select: { id: true, name: true } } },
  });
  return Promise.all(children.map(async (child) => ({
    studentId: child.Student_id,
    studentName: child.user?.name || '',
    records: await getMyStudentAttendance(child.Student_id, params),
  })));
};

// ── Subject-level (period) attendance — teacher marks, org reviews ─────────

export const getSubjectStudents = async (user, subjectId) => {
  const role = String(user?.role ?? '').trim().toUpperCase();

  const subject = await prisma.course.findUnique({
    where: { id: subjectId },
    select: { id: true, Course_id: true, Teacher_id: true, track: { select: { Org_id: true } } },
  });
  if (!subject) throw new AppError('Subject not found', 404);

  if (role === 'TEACHER') {
    if (subject.Teacher_id !== user.id) throw new AppError('This subject is not assigned to you', 403);
  } else if (role !== 'SCHOOL' && role !== 'ACADEMY') {
    throw new AppError('Access denied', 403);
  }

  const students = await prisma.student.findMany({
    where: { Course_id: subject.Course_id, OrgId: subject.track.Org_id },
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

export const markSubjectAttendance = async (user, subjectId, { date, records }) => {
  const role = String(user?.role ?? '').trim().toUpperCase();

  let orgId, classId;

  if (role === 'TEACHER') {
    const subject = await ensureTeacherOwnsSubject(user.id, subjectId);
    orgId = subject.track.Org_id;
    classId = subject.Course_id;
  } else if (role === 'SCHOOL' || role === 'ACADEMY') {
    // Org admin can mark attendance for any subject in their org
    const subject = await prisma.course.findFirst({
      where: { id: subjectId, track: { Org_id: user.id } },
      select: { Course_id: true, track: { select: { Org_id: true } } },
    });
    if (!subject) throw new AppError('Subject not found in your organization', 404);
    orgId = user.id;
    classId = subject.Course_id;
  } else {
    throw new AppError('Only teachers or organization admins can mark attendance', 403);
  }

  const parsedDate = new Date(date);
  const academicYearId = await getActiveAcademicYearId(orgId);

  const results = await Promise.all(
    records.map(({ studentId, status, note }) =>
      prisma.attendance.upsert({
        where: { studentId_subjectId_date: { studentId, subjectId, date: parsedDate } },
        create: { studentId, classId, subjectId, orgId, academicYearId, date: parsedDate, status: status || 'PRESENT', markedBy: user.id, note: note || null },
        update: { status: status || 'PRESENT', markedBy: user.id, note: note || null },
      })
    )
  );

  notifyAbsentLate(records, parsedDate).catch(() => {});

  return results.map(toDto);
};

export const getSubjectAttendance = async (user, subjectId, { date, academicYearId } = {}) => {
  const role = String(user?.role ?? '').trim().toUpperCase();

  const subject = await prisma.course.findUnique({
    where: { id: subjectId },
    select: { id: true, Teacher_id: true, track: { select: { Org_id: true } } },
  });
  if (!subject) throw new AppError('Subject not found', 404);

  if (role === 'TEACHER') {
    if (subject.Teacher_id !== user.id) throw new AppError('This subject is not assigned to you', 403);
  } else if (role !== 'SCHOOL' && role !== 'ACADEMY') {
    throw new AppError('Access denied', 403);
  }

  const yearId = academicYearId ? Number(academicYearId) : undefined;

  const records = await prisma.attendance.findMany({
    where: {
      subjectId,
      ...(date ? { date: new Date(date) } : {}),
      ...(yearId ? { academicYearId: yearId } : {}),
    },
    include: {
      student: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: [{ date: 'desc' }],
  });

  return records.map(toDto);
};
