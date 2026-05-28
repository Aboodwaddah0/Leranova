import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const toTermDto = (term) => ({
  id: term.id,
  academicYearId: term.academicYearId,
  termNumber: term.termNumber,
  name: term.name,
  startDate: term.startDate,
  endDate: term.endDate,
  status: term.status,
  createdAt: term.createdAt,
  updatedAt: term.updatedAt,
});

const toAuditDto = (log) => ({
  id: log.id,
  termId: log.termId,
  orgId: log.OrgId,
  actionType: log.actionType,
  oldValues: log.oldValues,
  newValues: log.newValues,
  changeReason: log.changeReason,
  updatedByUserId: log.updatedByUserId,
  createdAt: log.createdAt,
});

const parseDateOrThrow = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('Invalid term dates', 400);
  }
  return parsed;
};

const rangesOverlap = (leftStart, leftEnd, rightStart, rightEnd) =>
  leftStart <= rightEnd && leftEnd >= rightStart;

const writeAudit = (tx, { termId, orgId, userId, actionType, oldValues, newValues, changeReason }) =>
  tx.term_edit_audit.create({
    data: {
      termId,
      OrgId: orgId,
      updatedByUserId: userId,
      actionType,
      oldValues: oldValues ?? null,
      newValues: newValues ?? null,
      changeReason: changeReason ?? null,
    },
  });

const resolveAcademicYear = async (orgId, yearId) => {
  const year = await prisma.academic_year.findFirst({
    where: { id: yearId, OrgId: orgId },
    select: {
      id: true,
      OrgId: true,
      startDate: true,
      endDate: true,
      numberOfTerms: true,
    },
  });
  if (!year) throw new AppError('Academic year not found', 404);
  return year;
};

const getYearTerms = async (yearId) =>
  prisma.term.findMany({
    where: { academicYearId: yearId },
    select: {
      id: true,
      termNumber: true,
      startDate: true,
      endDate: true,
      status: true,
    },
    orderBy: { termNumber: 'asc' },
  });

const syncTermStatuses = async (terms, orgId) => {
  const now = new Date();
  const toUpdate = [];

  for (const term of terms) {
    if (term.status === 'LOCKED') continue;

    let newStatus = term.status;
    if (term.status === 'PLANNED' && now >= new Date(term.startDate)) newStatus = 'ACTIVE';
    else if (term.status === 'ACTIVE' && now > new Date(term.endDate)) newStatus = 'CLOSED';

    if (newStatus !== term.status) {
      toUpdate.push({ term, newStatus });
    }
  }

  if (!toUpdate.length) return;

  await prisma.$transaction(async (tx) => {
    for (const { term, newStatus } of toUpdate) {
      await tx.term.update({ where: { id: term.id }, data: { status: newStatus } });
      // Use raw insert for system-triggered audits (no real userId)
      await tx.term_edit_audit.create({
        data: {
          termId: term.id,
          OrgId: orgId,
          updatedByUserId: orgId, // org owner id as system actor
          actionType: 'AUTO_STATUS_CHANGE',
          oldValues: { status: term.status },
          newValues: { status: newStatus },
          changeReason: 'Automatic status transition based on date',
        },
      });
    }
  });
};

export const createTerm = async (orgId, yearId, data, actorUserId) => {
  const year = await resolveAcademicYear(orgId, yearId);
  const termNumber = Number(data.termNumber);
  const startDate = parseDateOrThrow(data.startDate);
  const endDate = parseDateOrThrow(data.endDate);

  const maxTerms = Number(year.numberOfTerms || 1);
  if (termNumber < 1 || termNumber > maxTerms) {
    throw new AppError(
      `Term number ${termNumber} is out of range. This academic year is configured for ${maxTerms} term(s). To add more terms, edit the academic year and increase "Number of Terms" first.`,
      400,
    );
  }

  if (endDate <= startDate) {
    throw new AppError('End date must be later than start date', 400);
  }

  const yearStart = new Date(year.startDate);
  const yearEnd = new Date(year.endDate);
  if (startDate < yearStart || endDate > yearEnd) {
    throw new AppError('Term dates must stay within the academic year range', 400);
  }

  const existingTerms = await getYearTerms(yearId);
  if (existingTerms.length >= maxTerms) {
    throw new AppError(
      `This academic year is set to ${maxTerms} term(s) and all slots are filled. To add another term, edit the academic year and increase "Number of Terms".`,
      409,
    );
  }

  const hasOverlap = existingTerms.some((term) => rangesOverlap(startDate, endDate, new Date(term.startDate), new Date(term.endDate)));
  if (hasOverlap) {
    throw new AppError('Term dates overlap with an existing term', 409);
  }

  const term = await prisma.$transaction(async (tx) => {
    const created = await tx.term.create({
      data: {
        academicYearId: yearId,
        termNumber,
        name: data.name,
        startDate,
        endDate,
        status: 'PLANNED',
      },
    });

    await writeAudit(tx, {
      termId: created.id,
      orgId,
      userId: actorUserId,
      actionType: 'CREATED',
      oldValues: null,
      newValues: {
        termNumber: created.termNumber,
        name: created.name,
        startDate: created.startDate,
        endDate: created.endDate,
      },
      changeReason: null,
    });

    return created;
  });

  return toTermDto(term);
};

export const activateTerm = async (orgId, yearId, termId, actorUserId) => {
  await resolveAcademicYear(orgId, yearId);

  const term = await prisma.term.findFirst({
    where: { id: termId, academicYearId: yearId },
  });
  if (!term) throw new AppError('Term not found', 404);

  if (term.status === 'ACTIVE') throw new AppError('Term is already active', 409);
  if (term.status === 'CLOSED') throw new AppError('Term is closed. Use "Reopen" to restore it to active.', 400);
  if (term.status === 'LOCKED') throw new AppError('Cannot activate a locked term', 403);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.term.update({
      where: { id: termId },
      data: { status: 'ACTIVE' },
    });
    await writeAudit(tx, {
      termId,
      orgId,
      userId: actorUserId,
      actionType: 'ACTIVATED',
      oldValues: { status: term.status },
      newValues: { status: 'ACTIVE' },
      changeReason: 'Manual activation by admin',
    });
    return updated;
  });

  return toTermDto(result);
};

export const listTerms = async (orgId, yearId) => {
  await resolveAcademicYear(orgId, yearId);

  const terms = await prisma.term.findMany({
    where: { academicYearId: yearId },
    orderBy: { termNumber: 'asc' },
  });

  await syncTermStatuses(terms, orgId);

  const refreshed = await prisma.term.findMany({
    where: { academicYearId: yearId },
    orderBy: { termNumber: 'asc' },
  });

  return refreshed.map(toTermDto);
};

export const getTermById = async (orgId, yearId, termId) => {
  await resolveAcademicYear(orgId, yearId);

  const term = await prisma.term.findFirst({
    where: { id: termId, academicYearId: yearId },
  });

  if (!term) throw new AppError('Term not found', 404);

  await syncTermStatuses([term], orgId);

  const refreshed = await prisma.term.findUnique({ where: { id: termId } });
  return toTermDto(refreshed);
};

export const updateTerm = async (orgId, yearId, termId, data, actorUserId, changeReason) => {
  const year = await resolveAcademicYear(orgId, yearId);

  const term = await prisma.term.findFirst({
    where: { id: termId, academicYearId: yearId },
  });

  if (!term) throw new AppError('Term not found', 404);

  await syncTermStatuses([term], orgId);
  const current = await prisma.term.findUnique({ where: { id: termId } });

  if (current.status === 'LOCKED') throw new AppError('Cannot edit a LOCKED term', 403);
  if (current.status === 'CLOSED') throw new AppError('Cannot edit a CLOSED term — reopen it first', 403);

  const updates = {};
  const oldValues = {};
  const newValues = {};

  const currentYearStart = new Date(year.startDate);
  const currentYearEnd = new Date(year.endDate);
  const siblingTerms = await getYearTerms(yearId);
  const siblings = siblingTerms.filter((item) => item.id !== termId);

  if (current.status === 'ACTIVE') {
    // Only endDate extension is allowed when ACTIVE
    if (data.startDate !== undefined) throw new AppError('Cannot change start date of an ACTIVE term', 403);
    if (data.name !== undefined) throw new AppError('Cannot change name of an ACTIVE term', 403);
    if (data.endDate === undefined) throw new AppError('Only endDate can be extended on an ACTIVE term', 400);
    const newEnd = parseDateOrThrow(data.endDate);
    const currentStart = new Date(current.startDate);
    if (newEnd <= new Date(current.endDate)) {
      throw new AppError('New end date must be later than the current end date', 400);
    }
    if (newEnd <= currentStart) {
      throw new AppError('End date must be later than start date', 400);
    }
    if (newEnd > currentYearEnd) {
      throw new AppError('Term dates must stay within the academic year range', 400);
    }
    const nextStart = currentStart;
    const overlaps = siblings.some((sibling) => rangesOverlap(nextStart, newEnd, new Date(sibling.startDate), new Date(sibling.endDate)));
    if (overlaps) {
      throw new AppError('Term dates overlap with an existing term', 409);
    }
    oldValues.endDate = current.endDate;
    newValues.endDate = newEnd;
    updates.endDate = newEnd;
  } else {
    // PLANNED — allow all fields
    const nextStart = data.startDate !== undefined ? parseDateOrThrow(data.startDate) : new Date(current.startDate);
    const nextEnd = data.endDate !== undefined ? parseDateOrThrow(data.endDate) : new Date(current.endDate);

    if (nextEnd <= nextStart) {
      throw new AppError('End date must be later than start date', 400);
    }
    if (nextStart < currentYearStart || nextEnd > currentYearEnd) {
      throw new AppError('Term dates must stay within the academic year range', 400);
    }

    const overlaps = siblings.some((sibling) => rangesOverlap(nextStart, nextEnd, new Date(sibling.startDate), new Date(sibling.endDate)));
    if (overlaps) {
      throw new AppError('Term dates overlap with an existing term', 409);
    }

    if (data.name !== undefined) { oldValues.name = current.name; newValues.name = data.name; updates.name = data.name; }
    if (data.startDate !== undefined) { oldValues.startDate = current.startDate; newValues.startDate = nextStart; updates.startDate = nextStart; }
    if (data.endDate !== undefined) { oldValues.endDate = current.endDate; newValues.endDate = nextEnd; updates.endDate = nextEnd; }
  }

  if (!Object.keys(updates).length) throw new AppError('No valid fields to update', 400);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.term.update({ where: { id: termId }, data: updates });

    await writeAudit(tx, {
      termId,
      orgId,
      userId: actorUserId,
      actionType: 'UPDATED',
      oldValues,
      newValues,
      changeReason,
    });

    return result;
  });

  return toTermDto(updated);
};

export const reopenTerm = async (orgId, yearId, termId, actorUserId, changeReason) => {
  await resolveAcademicYear(orgId, yearId);

  const term = await prisma.term.findFirst({
    where: { id: termId, academicYearId: yearId },
  });

  if (!term) throw new AppError('Term not found', 404);
  if (term.status !== 'CLOSED') throw new AppError('Only CLOSED terms can be reopened', 409);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.term.update({
      where: { id: termId },
      data: { status: 'ACTIVE' },
    });

    await writeAudit(tx, {
      termId,
      orgId,
      userId: actorUserId,
      actionType: 'REOPENED',
      oldValues: { status: 'CLOSED' },
      newValues: { status: 'ACTIVE' },
      changeReason,
    });

    return result;
  });

  return toTermDto(updated);
};

export const listTermAuditLogs = async (orgId, yearId, termId) => {
  await resolveAcademicYear(orgId, yearId);

  const term = await prisma.term.findFirst({ where: { id: termId, academicYearId: yearId }, select: { id: true } });
  if (!term) throw new AppError('Term not found', 404);

  const logs = await prisma.term_edit_audit.findMany({
    where: { termId, OrgId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  return logs.map(toAuditDto);
};
