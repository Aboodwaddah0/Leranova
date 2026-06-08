import AppError from '../utils/appError.js';
import {
  checkAcademyEligibility,
  issueAcademyCertificate,
  getStudentCertificates,
  getSchoolTermCertificates,
  getStudentSchoolCertificate,
  issueSchoolCertificates,
  publishSchoolCertificates,
  unpublishSchoolCertificates,
  getSchoolCertificateStatus,
} from '../services/certificateService.js';

const ts = () => new Date().toISOString();
const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, status, data, error: null, timestamp: ts() });

const ensureStudent = (req) => {
  if (String(req.user?.role || '').toUpperCase() !== 'STUDENT')
    throw new AppError('Student account required', 403);
  return Number(req.user.id);
};

const ensureOrg = (req) => {
  const role = String(req.user?.role || '').toUpperCase();
  if (role !== 'SCHOOL' && role !== 'ACADEMY')
    throw new AppError('Organization account required', 403);
  return Number(req.user.id);
};

// GET /api/student/certificates
export const listCertificatesController = async (req, res, next) => {
  try {
    const userId = ensureStudent(req);
    const data = await getStudentCertificates(userId);
    return ok(res, data);
  } catch (err) { next(err); }
};

// GET /api/student/certificates/academy/eligibility/:subjectId
export const academyEligibilityController = async (req, res, next) => {
  try {
    const userId = ensureStudent(req);
    const subjectId = Number(req.params.subjectId);
    if (!subjectId) throw new AppError('Invalid subject id', 400);
    const data = await checkAcademyEligibility(userId, subjectId);
    return ok(res, data);
  } catch (err) { next(err); }
};

// POST /api/student/certificates/academy/claim/:subjectId
export const claimAcademyCertificateController = async (req, res, next) => {
  try {
    const userId = ensureStudent(req);
    const subjectId = Number(req.params.subjectId);
    if (!subjectId) throw new AppError('Invalid subject id', 400);
    const data = await issueAcademyCertificate(userId, subjectId);
    return ok(res, data, 201);
  } catch (err) { next(err); }
};

// GET /api/student/school-certificate?termId=X
export const studentSchoolCertificateController = async (req, res, next) => {
  try {
    const userId = ensureStudent(req);
    const data = await getStudentSchoolCertificate(userId, req.query.termId);
    return ok(res, data);
  } catch (err) { next(err); }
};

// POST /api/academic-years/:yearId/terms/:termId/certificates/generate  (preview only)
// GET  /api/academic-years/:yearId/terms/:termId/certificates
export const orgTermCertificatesController = async (req, res, next) => {
  try {
    const orgId = ensureOrg(req);
    const termId = Number(req.params.termId);
    if (!termId) throw new AppError('Invalid term id', 400);
    const gradeLevel = req.query.gradeLevel !== undefined ? Number(req.query.gradeLevel) : undefined;
    const data = await getSchoolTermCertificates(orgId, termId, gradeLevel);
    return ok(res, data);
  } catch (err) { next(err); }
};

// POST /api/academic-years/:yearId/terms/:termId/certificates/issue
export const issueCertificatesController = async (req, res, next) => {
  try {
    const orgId = ensureOrg(req);
    const termId = Number(req.params.termId);
    if (!termId) throw new AppError('Invalid term id', 400);
    const gradeLevel = req.query.gradeLevel !== undefined ? Number(req.query.gradeLevel) : undefined;
    const data = await issueSchoolCertificates(orgId, termId, { gradeLevel });
    return ok(res, data, 201);
  } catch (err) { next(err); }
};

// POST /api/academic-years/:yearId/terms/:termId/certificates/publish
export const publishCertificatesController = async (req, res, next) => {
  try {
    const orgId = ensureOrg(req);
    const termId = Number(req.params.termId);
    if (!termId) throw new AppError('Invalid term id', 400);
    const data = await publishSchoolCertificates(orgId, termId);
    return ok(res, data);
  } catch (err) { next(err); }
};

// POST /api/academic-years/:yearId/terms/:termId/certificates/unpublish
export const unpublishCertificatesController = async (req, res, next) => {
  try {
    const orgId = ensureOrg(req);
    const termId = Number(req.params.termId);
    if (!termId) throw new AppError('Invalid term id', 400);
    const data = await unpublishSchoolCertificates(orgId, termId);
    return ok(res, data);
  } catch (err) { next(err); }
};

// GET /api/academic-years/:yearId/terms/:termId/certificates/status
export const certStatusController = async (req, res, next) => {
  try {
    const orgId = ensureOrg(req);
    const termId = Number(req.params.termId);
    if (!termId) throw new AppError('Invalid term id', 400);
    const data = await getSchoolCertificateStatus(orgId, termId);
    return ok(res, data);
  } catch (err) { next(err); }
};
