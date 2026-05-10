import {
  registerOrganization,
  loginOrganization,
  loginUser,
  loginParent,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
} from '../services/authService.js';
import {
  registerOrganizationSchema,
  loginOrganizationSchema,
  loginUserSchema,
  loginParentSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validations/authValidation.js';
import AppError from '../utils/appError.js';

export const register = async (req, res, next) => {
  try {
    const { error, value } = registerOrganizationSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await registerOrganization(value);
    const hasCheckout = Boolean(result?.checkout?.checkoutUrl);

    return res.status(201).json({
      message: hasCheckout
        ? 'Organization registered successfully. Complete payment via Stripe checkout URL.'
        : 'Organization registered successfully.',
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
    const { error, value } = loginUserSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await loginUser(value);

    return res.status(200).json({
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const loginParentController = async (req, res, next) => {
  try {
    const { error, value } = loginParentSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await loginParent(value);

    return res.status(200).json({
      message: 'Parent login successful',
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

export const getMeController = async (req, res, next) => {
  try {
    const user = await getMe(req.user.id);
    return res.status(200).json({ message: 'User profile fetched', data: user });
  } catch (err) {
    next(err);
  }
};

export const changePasswordController = async (req, res, next) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await changePassword({
      userId: req.user?.id,
      newPassword: value.newPassword,
    });

    return res.status(200).json({
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    return next(error);
  }
};
