import {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentsByCourse,
  getEnrollmentsByUser,
  deleteEnrollment,
} from '../services/enrollmentService.js';
import { createEnrollmentSchema } from '../validations/enrollmentValidation.js';
import AppError from '../utils/appError.js';

export const createEnrollmentController = async (req, res, next) => {
  try {
    const { error, value } = createEnrollmentSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const enrollment = await createEnrollment(req.user.id, req.user.role, value);
    return res.status(201).json({
      message: 'Enrollment created successfully',
      data: enrollment,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllEnrollmentsController = async (req, res, next) => {
  try {
    const enrollments = await getAllEnrollments(req.user.id, req.user.role);
    return res.status(200).json({
      message: 'Enrollments fetched successfully',
      data: enrollments,
    });
  } catch (err) {
    next(err);
  }
};

export const getEnrollmentsByCourseController = async (req, res, next) => {
  try {
    const courseId = Number(req.params.courseId);
    if (Number.isNaN(courseId)) return next(new AppError('Invalid course id', 400));

    const enrollments = await getEnrollmentsByCourse(req.user.id, req.user.role, courseId);
    return res.status(200).json({
      message: 'Course enrollments fetched successfully',
      data: enrollments,
    });
  } catch (err) {
    next(err);
  }
};

export const getEnrollmentsByUserController = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) return next(new AppError('Invalid user id', 400));

    const enrollments = await getEnrollmentsByUser(req.user.id, req.user.role, userId);
    return res.status(200).json({
      message: 'User enrollments fetched successfully',
      data: enrollments,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteEnrollmentController = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const courseId = Number(req.params.courseId);
    if (Number.isNaN(userId) || Number.isNaN(courseId)) {
      return next(new AppError('Invalid user id or course id', 400));
    }

    const result = await deleteEnrollment(req.user.id, req.user.role, userId, courseId);
    return res.status(200).json({
      message: 'Enrollment deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

