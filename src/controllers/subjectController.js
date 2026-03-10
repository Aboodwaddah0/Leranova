import * as subjectService from '../services/subjectService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createSubjectSchema, updateSubjectSchema } from '../validations/subjectValidation.js';
import AppError from '../utils/appError.js';

const getAllSubjects = catchAsync(async (req, res) => {
  const data = await subjectService.getAllSubjects();
  sendSuccess(res, data);
});

const getSubjectById = catchAsync(async (req, res) => {
  const data = await subjectService.getSubjectById(req.params.id);
  sendSuccess(res, data);
});

const createSubject = catchAsync(async (req, res, next) => {
  const { error } = createSubjectSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await subjectService.createSubject(req.body);
  sendSuccess(res, data, 201);
});

const updateSubject = catchAsync(async (req, res, next) => {
  const { error } = updateSubjectSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await subjectService.updateSubject(req.params.id, req.body);
  sendSuccess(res, data);
});

const deleteSubject = catchAsync(async (req, res) => {
  await subjectService.deleteSubject(req.params.id);
  sendSuccess(res, { message: 'Subject deleted successfully' });
});

export { getAllSubjects, getSubjectById, createSubject, updateSubject, deleteSubject };
