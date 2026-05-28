import {
  listComponents,
  createComponent,
  updateComponent,
  deleteComponent,
} from '../services/assessmentComponentService.js';
import {
  createComponentSchema,
  updateComponentSchema,
} from '../validations/assessmentComponentValidation.js';
import AppError from '../utils/appError.js';
import prisma from '../utils/prisma.js';

const getOrgId = async (userId, role) => {
  const r = String(role || '').trim().toUpperCase();
  if (r === 'SCHOOL' || r === 'ACADEMY') return userId;
  if (r === 'TEACHER') {
    const t = await prisma.teacher.findUnique({ where: { Teacher_id: userId }, select: { OrgId: true } });
    if (!t) throw new AppError('Teacher profile not found', 404);
    return t.OrgId;
  }
  throw new AppError('Access denied', 403);
};

export const listComponentsController = async (req, res, next) => {
  try {
    const orgId = await getOrgId(req.user.id, req.user.role);
    const { subjectId, termId } = req.query;
    const data = await listComponents(orgId, { subjectId, termId });
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: new Date() });
  } catch (err) { next(err); }
};

export const createComponentController = async (req, res, next) => {
  try {
    const orgId = await getOrgId(req.user.id, req.user.role);
    const { error, value } = createComponentSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));
    const data = await createComponent(orgId, value);
    return res.status(201).json({ success: true, status: 201, data, error: null, timestamp: new Date() });
  } catch (err) { next(err); }
};

export const updateComponentController = async (req, res, next) => {
  try {
    const orgId = await getOrgId(req.user.id, req.user.role);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return next(new AppError('Invalid component id', 400));
    const { error, value } = updateComponentSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));
    const data = await updateComponent(orgId, id, value);
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: new Date() });
  } catch (err) { next(err); }
};

export const deleteComponentController = async (req, res, next) => {
  try {
    const orgId = await getOrgId(req.user.id, req.user.role);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return next(new AppError('Invalid component id', 400));
    await deleteComponent(orgId, id);
    return res.status(204).send();
  } catch (err) { next(err); }
};
