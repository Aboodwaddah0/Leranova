import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from '../services/subjectService.js';
import { createSubjectSchema, updateSubjectSchema } from '../validations/subjectValidation.js';
import AppError from '../utils/appError.js';

// Sample manual test (Subject):
// - Authorization: Bearer <org-jwt>
// - POST /api/subjects
//   {
//     "Course_id": 1,
//     "Teacher_id": 1,
//     "name": "Algebra",
//     "Description": "Intro to algebra"
//   }

export const createSubjectController = async (req, res, next) => {
  try {
    const { error, value } = createSubjectSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const orgId = req.user.id;
    const subject = await createSubject(orgId, value);

    return res.status(201).json({
      message: 'Subject created successfully',
      data: subject,
    });
  } catch (err) {
    next(err);
  }
};

export const getSubjectsController = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const courseId = req.query.courseId ? Number(req.query.courseId) : undefined;

    if (req.query.courseId && Number.isNaN(courseId)) {
      return next(new AppError('Invalid courseId query parameter', 400));
    }

    const subjects = await getSubjects(orgId, courseId);

    return res.status(200).json({
      message: 'Subjects fetched successfully',
      data: subjects,
    });
  } catch (err) {
    next(err);
  }
};

export const getSubjectByIdController = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const subjectId = Number(req.params.id);

    if (Number.isNaN(subjectId)) {
      return next(new AppError('Invalid subject id', 400));
    }

    const subject = await getSubjectById(orgId, subjectId);

    return res.status(200).json({
      message: 'Subject fetched successfully',
      data: subject,
    });
  } catch (err) {
    next(err);
  }
};

export const updateSubjectController = async (req, res, next) => {
  try {
    const subjectId = Number(req.params.id);

    if (Number.isNaN(subjectId)) {
      return next(new AppError('Invalid subject id', 400));
    }

    const { error, value } = updateSubjectSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const orgId = req.user.id;
    const subject = await updateSubject(orgId, subjectId, value);

    return res.status(200).json({
      message: 'Subject updated successfully',
      data: subject,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteSubjectController = async (req, res, next) => {
  try {
    const subjectId = Number(req.params.id);

    if (Number.isNaN(subjectId)) {
      return next(new AppError('Invalid subject id', 400));
    }

    const orgId = req.user.id;
    const result = await deleteSubject(orgId, subjectId);

    return res.status(200).json({
      message: 'Subject deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
