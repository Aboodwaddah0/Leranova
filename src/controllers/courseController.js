import * as courseService from '../services/courseService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createCourseSchema, updateCourseSchema } from '../validations/courseValidation.js';
import AppError from '../utils/appError.js';

const getAllCourses = catchAsync(async (req, res) => {
  const data = await courseService.getAllCourses();
  sendSuccess(res, data);
});

const getCourseById = catchAsync(async (req, res) => {
  const data = await courseService.getCourseById(req.params.id);
  sendSuccess(res, data);
});

const createCourse = catchAsync(async (req, res, next) => {
  const { error } = createCourseSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await courseService.createCourse(req.body);
  sendSuccess(res, data, 201);
});

const updateCourse = catchAsync(async (req, res, next) => {
  const { error } = updateCourseSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await courseService.updateCourse(req.params.id, req.body);
  sendSuccess(res, data);
});

const deleteCourse = catchAsync(async (req, res) => {
  await courseService.deleteCourse(req.params.id);
  sendSuccess(res, { message: 'Course deleted successfully' });
});

export { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse };
