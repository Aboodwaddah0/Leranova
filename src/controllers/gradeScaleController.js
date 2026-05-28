import { getGradeScale, upsertGradeScale, deleteGradeScale } from '../services/gradeScaleService.js';
import { upsertGradeScaleSchema } from '../validations/gradeScaleValidation.js';
import AppError from '../utils/appError.js';

const requireOrg = (role) => {
  const r = String(role || '').trim().toUpperCase();
  if (r !== 'SCHOOL' && r !== 'ACADEMY') throw new AppError('Access denied', 403);
};

export const getGradeScaleController = async (req, res, next) => {
  try {
    const data = await getGradeScale(req.user.id);
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: new Date() });
  } catch (err) { next(err); }
};

export const upsertGradeScaleController = async (req, res, next) => {
  try {
    requireOrg(req.user.role);
    const { error, value } = upsertGradeScaleSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));
    const data = await upsertGradeScale(req.user.id, value);
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: new Date() });
  } catch (err) { next(err); }
};

export const deleteGradeScaleController = async (req, res, next) => {
  try {
    requireOrg(req.user.role);
    await deleteGradeScale(req.user.id);
    return res.status(204).send();
  } catch (err) { next(err); }
};
