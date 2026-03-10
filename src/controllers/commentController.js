import * as commentService from '../services/commentService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createCommentSchema } from '../validations/commentValidation.js';
import AppError from '../utils/appError.js';

const getCommentsByLesson = catchAsync(async (req, res) => {
  const data = await commentService.getCommentsByLesson(req.params.lessonId);
  sendSuccess(res, data);
});

const createComment = catchAsync(async (req, res, next) => {
  const { error } = createCommentSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await commentService.createComment(req.user.id, req.body);
  sendSuccess(res, data, 201);
});

const deleteComment = catchAsync(async (req, res) => {
  await commentService.deleteComment(req.params.id, req.user.id);
  sendSuccess(res, { message: 'Comment deleted successfully' });
});

export { getCommentsByLesson, createComment, deleteComment };
