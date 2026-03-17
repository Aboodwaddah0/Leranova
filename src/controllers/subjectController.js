import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} from '../services/subjectService.js';
import { createSubjectSchema, updateSubjectSchema } from '../validations/subjectValidation.js';
import AppError from '../utils/appError.js';

const normalizeSubjectPayload = (payload) => ({
  Course_id: payload.Course_id ?? payload.courseId,
  Teacher_id: payload.Teacher_id ?? payload.teacherId,
  name: payload.name,
  Description: payload.Description ?? payload.description,
});

const getCourseIdFromParams = (req) => {
  const courseId = Number(req.params.courseId);

  if (Number.isNaN(courseId)) {
    throw new AppError('Invalid course id', 400);
  }

  return courseId;
};

const getOptionalCourseIdFromParams = (req) => {
  if (req.params.courseId === undefined) {
    return undefined;
  }

  const courseId = Number(req.params.courseId);

  if (Number.isNaN(courseId)) {
    throw new AppError('Invalid course id', 400);
  }

  return courseId;
};

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
    const courseId = getCourseIdFromParams(req);
    const normalizedPayload = {
      ...normalizeSubjectPayload(req.body),
      Course_id: courseId,
    };
    const { error, value } = createSubjectSchema.validate(normalizedPayload);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const orgId = req.user.id;
  const subject = await createSubject(orgId, courseId, value);

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
    const courseId = getCourseIdFromParams(req);

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
    const courseId = getOptionalCourseIdFromParams(req);
    const subjectId = Number(req.params.subjectId);

    if (Number.isNaN(subjectId)) {
      return next(new AppError('Invalid subject id', 400));
    }

    const subject = await getSubjectById(orgId, courseId, subjectId);

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
    const courseId = getOptionalCourseIdFromParams(req);
    const subjectId = Number(req.params.subjectId);

    if (Number.isNaN(subjectId)) {
      return next(new AppError('Invalid subject id', 400));
    }

    const normalizedPayload = normalizeSubjectPayload(req.body);
    const { error, value } = updateSubjectSchema.validate(normalizedPayload);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const orgId = req.user.id;
  const subject = await updateSubject(orgId, courseId, subjectId, value);

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
    const courseId = getOptionalCourseIdFromParams(req);
    const subjectId = Number(req.params.subjectId);

    if (Number.isNaN(subjectId)) {
      return next(new AppError('Invalid subject id', 400));
    }

    const orgId = req.user.id;
  const result = await deleteSubject(orgId, courseId, subjectId);

    return res.status(200).json({
      message: 'Subject deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
