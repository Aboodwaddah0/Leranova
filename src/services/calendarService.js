import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const toDto = (e) => ({
  id: e.id,
  title: e.title,
  description: e.description,
  startDate: e.startDate,
  endDate: e.endDate,
  type: e.type,
  termId: e.termId,
  isPublished: e.isPublished,
  createdBy: e.createdBy,
  createdAt: e.createdAt,
});

export const createEvent = async (orgId, createdBy, data) => {
  const { title, description, startDate, endDate, type, termId, isPublished } = data;

  if (new Date(endDate) < new Date(startDate)) {
    throw new AppError('End date cannot be before start date', 400);
  }

  if (termId) {
    const term = await prisma.term.findFirst({
      where: { id: termId, academic_year: { OrgId: orgId } },
    });
    if (!term) throw new AppError('Term not found', 404);
  }

  const event = await prisma.school_event.create({
    data: {
      orgId,
      createdBy,
      title,
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type: type || 'OTHER',
      termId: termId || null,
      isPublished: isPublished !== false,
    },
  });

  return toDto(event);
};

export const listEvents = async (orgId, filters = {}) => {
  const { termId, type, from, to } = filters;
  const events = await prisma.school_event.findMany({
    where: {
      orgId,
      ...(termId ? { termId: Number(termId) } : {}),
      ...(type ? { type } : {}),
      ...(from || to ? {
        startDate: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    },
    orderBy: { startDate: 'asc' },
  });
  return events.map(toDto);
};

export const getEvent = async (orgId, eventId) => {
  const event = await prisma.school_event.findFirst({
    where: { id: eventId, orgId },
  });
  if (!event) throw new AppError('Event not found', 404);
  return toDto(event);
};

export const updateEvent = async (orgId, eventId, data) => {
  const event = await prisma.school_event.findFirst({
    where: { id: eventId, orgId },
  });
  if (!event) throw new AppError('Event not found', 404);

  const updated = await prisma.school_event.update({
    where: { id: eventId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate !== undefined ? { endDate: new Date(data.endDate) } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.termId !== undefined ? { termId: data.termId } : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
    },
  });
  return toDto(updated);
};

export const deleteEvent = async (orgId, eventId) => {
  const event = await prisma.school_event.findFirst({
    where: { id: eventId, orgId },
  });
  if (!event) throw new AppError('Event not found', 404);
  await prisma.school_event.delete({ where: { id: eventId } });
  return { id: eventId };
};
