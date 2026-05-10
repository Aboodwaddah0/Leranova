import {
  createTerm,
  listTerms,
  getTermById,
  updateTerm,
  reopenTerm,
  listTermAuditLogs,
} from '../services/termService.js';
import {
  createTermSchema,
  updateTermSchema,
  reopenTermSchema,
} from '../validations/termValidation.js';
import AppError from '../utils/appError.js';
import prisma from '../utils/prisma.js';

const parseYearId = (req, next) => {
  const id = Number(req.params.yearId);
  if (!Number.isInteger(id) || id <= 0) { next(new AppError('Invalid academic year id', 400)); return null; }
  return id;
};

const parseTermId = (req, next) => {
  const id = Number(req.params.termId);
  if (!Number.isInteger(id) || id <= 0) { next(new AppError('Invalid term id', 400)); return null; }
  return id;
};

const getOrgIdForUser = async (userId, userRole) => {
  const role = String(userRole || '').trim().toUpperCase();

  if (role === 'SCHOOL') {
    return userId;
  }

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: userId },
      select: { OrgId: true },
    });
    if (!teacher) throw new AppError('Teacher profile not found', 404);
    return teacher.OrgId;
  }

  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { Student_id: userId },
      select: { OrgId: true },
    });
    if (!student) throw new AppError('Student profile not found', 404);
    return student.OrgId;
  }

  throw new AppError('Invalid user role for term access', 403);
};

export const createTermController = async (req, res, next) => {
  try {
    const yearId = parseYearId(req, next);
    if (yearId === null) return;

    const orgId = await getOrgIdForUser(req.user.id, req.user.role);

    const { error, value } = createTermSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const data = await createTerm(orgId, yearId, value, req.user.id);
    return res.status(201).json({ message: 'Term created successfully', data });
  } catch (err) { next(err); }
};

export const listTermsController = async (req, res, next) => {
  try {
    const yearId = parseYearId(req, next);
    if (yearId === null) return;

    const orgId = await getOrgIdForUser(req.user.id, req.user.role);
    const data = await listTerms(orgId, yearId);
    return res.status(200).json({ message: 'Terms fetched successfully', data });
  } catch (err) { next(err); }
};

export const getTermController = async (req, res, next) => {
  try {
    const yearId = parseYearId(req, next);
    if (yearId === null) return;
    const termId = parseTermId(req, next);
    if (termId === null) return;

    const orgId = await getOrgIdForUser(req.user.id, req.user.role);
    const data = await getTermById(orgId, yearId, termId);
    return res.status(200).json({ message: 'Term fetched successfully', data });
  } catch (err) { next(err); }
};

export const updateTermController = async (req, res, next) => {
  try {
    const yearId = parseYearId(req, next);
    if (yearId === null) return;
    const termId = parseTermId(req, next);
    if (termId === null) return;

    const orgId = await getOrgIdForUser(req.user.id, req.user.role);

    const { error, value } = updateTermSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const { changeReason, ...fields } = value;
    const data = await updateTerm(orgId, yearId, termId, fields, req.user.id, changeReason);
    return res.status(200).json({ message: 'Term updated successfully', data });
  } catch (err) { next(err); }
};

export const reopenTermController = async (req, res, next) => {
  try {
    const yearId = parseYearId(req, next);
    if (yearId === null) return;
    const termId = parseTermId(req, next);
    if (termId === null) return;

    const orgId = await getOrgIdForUser(req.user.id, req.user.role);

    const { error, value } = reopenTermSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const data = await reopenTerm(orgId, yearId, termId, req.user.id, value.changeReason);
    return res.status(200).json({ message: 'Term reopened successfully', data });
  } catch (err) { next(err); }
};

export const listTermAuditLogsController = async (req, res, next) => {
  try {
    const yearId = parseYearId(req, next);
    if (yearId === null) return;
    const termId = parseTermId(req, next);
    if (termId === null) return;

    const orgId = await getOrgIdForUser(req.user.id, req.user.role);

    const data = await listTermAuditLogs(orgId, yearId, termId);
    return res.status(200).json({ message: 'Audit logs fetched successfully', data });
  } catch (err) { next(err); }
};
