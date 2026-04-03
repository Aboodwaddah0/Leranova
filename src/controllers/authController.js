import {
  registerOrganization,
  loginOrganization,
  loginUser,
  forgotPassword,
  resetPassword,
} from '../services/authService.js';
import {
  registerOrganizationSchema,
  loginOrganizationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validations/authValidation.js';
import AppError from '../utils/appError.js';

export const register = async (req, res, next) => {
  try {
    const { error, value } = registerOrganizationSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await registerOrganization(value);

    return res.status(201).json({
      message: 'Organization registered successfully and is pending approval',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { error, value } = loginOrganizationSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await loginOrganization(value);

    return res.status(200).json({
      message: 'Organization logged in successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// Teacher/Student login with email and password.
export const loginUserController = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    return res.status(200).json({
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const forgotPasswordController = async (req, res, next) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    await forgotPassword(value);

    return res.status(200).json({
      message: 'If the account exists, a password reset link was sent',
    });
  } catch (error) {
    return next(error);
  }
};

export const resetPasswordController = async (req, res, next) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    await resetPassword(value);

    return res.status(200).json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    return next(error);
  }
};
