import prisma from '../utils/prisma.js';
import {
  createAcademicYear,
  listAcademicYears,
  getAcademicYearById,
  updateAcademicYear,
} from '../services/academicYearService.js';
import {
  createAcademicYearSchema,
  updateAcademicYearSchema,
} from '../validations/academicYearValidation.js';
import AppError from '../utils/appError.js';

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

  throw new AppError('Invalid user role for academic years access', 403);
};

export const createAcademicYearController = async (req, res, next) => {
  try {
    const { error, value } = createAcademicYearSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const data = await createAcademicYear(req.user.id, value);
    return res.status(201).json({ message: 'Academic year created successfully', data });
  } catch (err) { next(err); }
};

export const listAcademicYearsController = async (req, res, next) => {
  try {
    const orgId = await getOrgIdForUser(req.user.id, req.user.role);
    const data = await listAcademicYears(orgId);
    return res.status(200).json({ message: 'Academic years fetched successfully', data });
  } catch (err) { next(err); }
};

export const getAcademicYearController = async (req, res, next) => {
  try {
    const yearId = Number(req.params.yearId);
    if (!Number.isInteger(yearId)) return next(new AppError('Invalid academic year id', 400));

    const orgId = await getOrgIdForUser(req.user.id, req.user.role);
    const data = await getAcademicYearById(orgId, yearId);
    return res.status(200).json({ message: 'Academic year fetched successfully', data });
  } catch (err) { next(err); }
};

export const updateAcademicYearController = async (req, res, next) => {
  try {
    const yearId = Number(req.params.yearId);
    if (!Number.isInteger(yearId)) return next(new AppError('Invalid academic year id', 400));

    const { error, value } = updateAcademicYearSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const data = await updateAcademicYear(req.user.id, yearId, value);
    return res.status(200).json({ message: 'Academic year updated successfully', data });
  } catch (err) { next(err); }
};
