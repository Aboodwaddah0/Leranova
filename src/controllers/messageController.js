import * as messageService from '../services/messageService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { sendMessageSchema } from '../validations/messageValidation.js';
import AppError from '../utils/appError.js';

const getChatMessages = catchAsync(async (req, res) => {
  const data = await messageService.getChatMessages(req.params.chatId);
  sendSuccess(res, data);
});

const sendMessage = catchAsync(async (req, res, next) => {
  const { error } = sendMessageSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));
  const data = await messageService.sendMessage(req.user.id, req.body);
  sendSuccess(res, data, 201);
});

const deleteMessage = catchAsync(async (req, res) => {
  await messageService.deleteMessage(req.params.id, req.user.id);
  sendSuccess(res, { message: 'Message deleted' });
});

export { getChatMessages, sendMessage, deleteMessage };
