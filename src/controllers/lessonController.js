import * as lessonService from '../services/lessonService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createLessonSchema, updateLessonSchema } from '../validations/lessonValidation.js';
import AppError from '../utils/appError.js';

const getAllLessons = catchAsync(async (req, res) => {
  const data = await lessonService.getAllLessons();
  sendSuccess(res, data);
});

const getLessonById = catchAsync(async (req, res) => {
  const data = await lessonService.getLessonById(req.params.id);
  sendSuccess(res, data);
});

const createLesson = catchAsync(async (req, res, next) => {
  const { error } = createLessonSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await lessonService.createLesson(req.body);
  sendSuccess(res, data, 201);
});

const updateLesson = catchAsync(async (req, res, next) => {
  const { error } = updateLessonSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await lessonService.updateLesson(req.params.id, req.body);
  sendSuccess(res, data);
});

const deleteLesson = catchAsync(async (req, res) => {
  await lessonService.deleteLesson(req.params.id);
  sendSuccess(res, { message: 'Lesson deleted successfully' });
});

export { getAllLessons, getLessonById, createLesson, updateLesson, deleteLesson };
