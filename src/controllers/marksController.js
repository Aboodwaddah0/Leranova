import * as marksService from '../services/marksService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createMarkSchema } from '../validations/marksValidation.js';
import AppError from '../utils/appError.js';

const getMarksByUser = catchAsync(async (req, res) => {
  const data = await marksService.getMarksByUser(req.params.userId);
  sendSuccess(res, data);
});

const createMark = catchAsync(async (req, res, next) => {
  const { error } = createMarkSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await marksService.createMark(req.body);
  sendSuccess(res, data, 201);
});

const updateMark = catchAsync(async (req, res) => {
  const data = await marksService.updateMark(req.params.id, req.body);
  sendSuccess(res, data);
});

const deleteMark = catchAsync(async (req, res) => {
  await marksService.deleteMark(req.params.id);
  sendSuccess(res, { message: 'Mark deleted successfully' });
});

export { getMarksByUser, createMark, updateMark, deleteMark };
