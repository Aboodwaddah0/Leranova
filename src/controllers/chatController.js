import * as chatService from '../services/chatService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { createChatSchema } from '../validations/chatValidation.js';
import AppError from '../utils/appError.js';

const getUserChats = catchAsync(async (req, res) => {
  const data = await chatService.getUserChats(req.user.id);
  sendSuccess(res, data);
});

const getChatById = catchAsync(async (req, res) => {
  const data = await chatService.getChatById(req.params.id);
  sendSuccess(res, data);
});

const createChat = catchAsync(async (req, res, next) => {
  const { error } = createChatSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await chatService.createChat(req.user.id, req.body);
  sendSuccess(res, data, 201);
});

export { getUserChats, getChatById, createChat };
