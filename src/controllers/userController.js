import * as userService from '../services/userService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { updateUserSchema } from '../validations/userValidation.js';
import AppError from '../utils/appError.js';

const getAllUsers = catchAsync(async (req, res) => {
  const data = await userService.getAllUsers();
  sendSuccess(res, data);
});

const getUserById = catchAsync(async (req, res) => {
  const data = await userService.getUserById(req.params.id);
  sendSuccess(res, data);
});

const updateUser = catchAsync(async (req, res, next) => {
  const { error } = updateUserSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  const data = await userService.updateUser(req.params.id, req.body);
  sendSuccess(res, data);
});

const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUser(req.params.id);
  sendSuccess(res, { message: 'User deleted successfully' });
});

export { getAllUsers, getUserById, updateUser, deleteUser };
