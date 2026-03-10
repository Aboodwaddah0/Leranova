import * as authService from '../services/authService.js';
import catchAsync from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { registerSchema, loginSchema } from '../validations/authValidation.js';
import AppError from '../utils/appError.js';

const register = catchAsync(async (req, res, next) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  const data = await authService.register(req.body);
  sendSuccess(res, data, 201);
});

const login = catchAsync(async (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  const data = await authService.login(req.body);
  sendSuccess(res, data);
});

const loginOrg = catchAsync(async (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  const data = await authService.loginOrg(req.body);
  sendSuccess(res, data);
});

export { register, login, loginOrg };
