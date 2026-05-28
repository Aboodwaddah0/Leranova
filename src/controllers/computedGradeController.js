import {
  computeAllGradesForTerm,
  listComputedGrades,
  getTermRankings,
} from '../services/gradingEngineService.js';
import AppError from '../utils/appError.js';

const requireOrg = (role) => {
  const r = String(role || '').trim().toUpperCase();
  if (r !== 'SCHOOL' && r !== 'ACADEMY') throw new AppError('Access denied', 403);
};

const getOrgId = (req) => {
  const r = String(req.user.role || '').trim().toUpperCase();
  if (r === 'SCHOOL' || r === 'ACADEMY') return req.user.id;
  throw new AppError('Access denied', 403);
};

export const computeGradesController = async (req, res, next) => {
  try {
    requireOrg(req.user.role);
    const termId = Number(req.body.termId);
    if (!Number.isInteger(termId) || termId <= 0) {
      return next(new AppError('termId is required and must be a positive integer', 400));
    }
    const orgId = getOrgId(req);
    const data = await computeAllGradesForTerm(orgId, termId);
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: new Date() });
  } catch (err) { next(err); }
};

export const listComputedGradesController = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { termId, subjectId, studentId } = req.query;
    const data = await listComputedGrades(orgId, { termId, subjectId, studentId });
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: new Date() });
  } catch (err) { next(err); }
};

export const getRankingsController = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { termId, courseId } = req.query;
    const data = await getTermRankings(orgId, { termId, courseId });
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: new Date() });
  } catch (err) { next(err); }
};
