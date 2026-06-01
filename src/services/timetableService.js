import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const slotInclude = {
  track:   { select: { id: true, Name: true, GradeLevel: true } },
  course:  { select: { id: true, name: true } },
  teacher: { select: { Teacher_id: true, user: { select: { name: true } } } },
};

const toDto = (s) => ({
  id:             s.id,
  orgId:          s.orgId,
  trackId:        s.trackId,
  trackName:      s.track?.Name ?? null,
  gradeLevel:     s.track?.GradeLevel ?? null,
  courseId:       s.courseId,
  subjectName:    s.course?.name ?? null,
  teacherId:      s.teacherId ?? null,
  teacherName:    s.teacher?.user?.name ?? null,
  dayOfWeek:      s.dayOfWeek,
  startTime:      s.startTime,
  endTime:        s.endTime,
  roomNumber:     s.roomNumber ?? null,
  academicYearId: s.academicYearId ?? null,
  isActive:       s.isActive,
  createdAt:      s.createdAt,
});

export const listSlots = async (orgId, { trackId, teacherId, academicYearId } = {}) => {
  const rows = await prisma.timetable_slot.findMany({
    where: {
      orgId,
      ...(trackId        ? { trackId:        Number(trackId)        } : {}),
      ...(teacherId      ? { teacherId:       Number(teacherId)      } : {}),
      ...(academicYearId ? { academicYearId:  Number(academicYearId) } : {}),
    },
    include: slotInclude,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  return rows.map(toDto);
};

export const getSlotById = async (orgId, slotId) => {
  const slot = await prisma.timetable_slot.findFirst({
    where: { id: slotId, orgId },
    include: slotInclude,
  });
  if (!slot) throw new AppError('Timetable slot not found', 404);
  return toDto(slot);
};

export const createSlot = async (orgId, data) => {
  const { trackId, courseId, teacherId, dayOfWeek, startTime, endTime, roomNumber, academicYearId } = data;

  // Conflict: same class, same day, same start time
  const conflict = await prisma.timetable_slot.findFirst({
    where: { trackId: Number(trackId), dayOfWeek: Number(dayOfWeek), startTime },
    select: { id: true },
  });
  if (conflict) throw new AppError('This class already has a slot at that day and time', 409);

  const slot = await prisma.timetable_slot.create({
    data: {
      orgId,
      trackId:        Number(trackId),
      courseId:       Number(courseId),
      teacherId:      teacherId ? Number(teacherId) : null,
      dayOfWeek:      Number(dayOfWeek),
      startTime,
      endTime,
      roomNumber:     roomNumber || null,
      academicYearId: academicYearId ? Number(academicYearId) : null,
    },
    include: slotInclude,
  });
  return toDto(slot);
};

export const updateSlot = async (orgId, slotId, data) => {
  const existing = await prisma.timetable_slot.findFirst({ where: { id: slotId, orgId }, select: { id: true } });
  if (!existing) throw new AppError('Timetable slot not found', 404);

  const { trackId, courseId, teacherId, dayOfWeek, startTime, endTime, roomNumber, academicYearId } = data;

  // Conflict check excluding self
  if (trackId && dayOfWeek && startTime) {
    const conflict = await prisma.timetable_slot.findFirst({
      where: { trackId: Number(trackId), dayOfWeek: Number(dayOfWeek), startTime, NOT: { id: slotId } },
      select: { id: true },
    });
    if (conflict) throw new AppError('This class already has a slot at that day and time', 409);
  }

  const slot = await prisma.timetable_slot.update({
    where: { id: slotId },
    data: {
      ...(trackId        !== undefined && { trackId:        Number(trackId)        }),
      ...(courseId       !== undefined && { courseId:       Number(courseId)       }),
      ...(dayOfWeek      !== undefined && { dayOfWeek:      Number(dayOfWeek)      }),
      ...(startTime      !== undefined && { startTime                               }),
      ...(endTime        !== undefined && { endTime                                 }),
      ...(roomNumber     !== undefined && { roomNumber:     roomNumber || null      }),
      ...(academicYearId !== undefined && { academicYearId: academicYearId ? Number(academicYearId) : null }),
      ...(teacherId      !== undefined && { teacherId:      teacherId ? Number(teacherId) : null }),
    },
    include: slotInclude,
  });
  return toDto(slot);
};

export const deleteSlot = async (orgId, slotId) => {
  const existing = await prisma.timetable_slot.findFirst({ where: { id: slotId, orgId }, select: { id: true } });
  if (!existing) throw new AppError('Timetable slot not found', 404);
  await prisma.timetable_slot.delete({ where: { id: slotId } });
  return { id: slotId };
};

// ── Role-aware "my timetable" ────────────────────────────────────────────────

export const getStudentTimetable = async (studentUserId) => {
  const student = await prisma.student.findUnique({
    where: { Student_id: studentUserId },
    select: { OrgId: true, Course_id: true },
  });
  if (!student || !student.Course_id) throw new AppError('Student class not found', 404);
  return listSlots(student.OrgId, { trackId: student.Course_id });
};

export const getTeacherTimetable = async (teacherUserId) => {
  const teacher = await prisma.teacher.findUnique({
    where: { Teacher_id: teacherUserId },
    select: { OrgId: true },
  });
  if (!teacher) throw new AppError('Teacher profile not found', 404);
  return listSlots(teacher.OrgId, { teacherId: teacherUserId });
};

export const getParentChildTimetable = async (parentUserId) => {
  const child = await prisma.student.findFirst({
    where: { Parent_id: parentUserId },
    select: { OrgId: true, Course_id: true },
  });
  if (!child || !child.Course_id) throw new AppError('No children with an assigned class found', 404);
  return listSlots(child.OrgId, { trackId: child.Course_id });
};
