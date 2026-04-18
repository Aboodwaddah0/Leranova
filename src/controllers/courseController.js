import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from '../services/courseService.js';
import { createCourseSchema, updateCourseSchema } from '../validations/courseValidation.js';
import AppError from '../utils/appError.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUpload.js';

const resolveThumbnailUrl = async (file) => {
  if (!file) {
    return null;
  }

  const uploaded = await uploadBufferToCloudinary(file.buffer, {
    folder: 'learnova/courses/thumbnails',
    resource_type: 'image',
  });

  return uploaded?.url || null;
};

// Sample manual test (Course):
// - Authorization: Bearer <org-jwt>
// - POST /api/courses
//   {
//     "Name": "Math 101",
//     "Description": "Basic math",
//     "Thumbnail": "https://example.com/thumb.png",
//     "Start": "2026-01-01",
//     "End": "2026-06-01"
//   }

export const createCourseController = async (req, res, next) => {
  try {
    const requestBody = req.body && typeof req.body === 'object' ? req.body : {};
    const { error, value } = createCourseSchema.validate(requestBody);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const payload = value || {};

    if (req.file) {
      payload.Thumbnail = await resolveThumbnailUrl(req.file);
    }

    const orgId = req.user.id;
    const course = await createCourse(orgId, payload);

    return res.status(201).json({
      message: 'Course created successfully',
      data: course,
    });
  } catch (err) {
    next(err);
  }
};

export const getCoursesController = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const courses = await getCourses(orgId);

    return res.status(200).json({
      message: 'Courses fetched successfully',
      data: courses,
    });
  } catch (err) {
    next(err);
  }
};

export const getCourseByIdController = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const courseId = Number(req.params.id);

    if (Number.isNaN(courseId)) {
      return next(new AppError('Invalid course id', 400));
    }

    const course = await getCourseById(orgId, courseId);

    return res.status(200).json({
      message: 'Course fetched successfully',
      data: course,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCourseController = async (req, res, next) => {
  try {
    const courseId = Number(req.params.id);

    if (Number.isNaN(courseId)) {
      return next(new AppError('Invalid course id', 400));
    }

    const requestBody = req.body && typeof req.body === 'object' ? req.body : {};
    const { error, value } = updateCourseSchema.validate(requestBody);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const payload = value || {};

    if (req.file) {
      payload.Thumbnail = await resolveThumbnailUrl(req.file);
    }

    const orgId = req.user.id;
    const course = await updateCourse(orgId, courseId, payload);

    return res.status(200).json({
      message: 'Course updated successfully',
      data: course,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCourseController = async (req, res, next) => {
  try {
    const courseId = Number(req.params.id);

    if (Number.isNaN(courseId)) {
      return next(new AppError('Invalid course id', 400));
    }

    const orgId = req.user.id;
    const result = await deleteCourse(orgId, courseId);

    return res.status(200).json({
      message: 'Course deleted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
