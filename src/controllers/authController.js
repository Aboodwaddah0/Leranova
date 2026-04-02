import {
  registerOrganization,
  loginOrganization,
  loginUser,
  handleGoogleOAuthCallback,
  sendLoginCodeToUser,
  verifyLoginCodeAndGenerateToken,
} from '../services/authService.js';
import {
  registerOrganizationSchema,
  loginOrganizationSchema,
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

// Teacher/Student login step 1: email + password -> send OTP.
export const loginUserController = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    return res.status(200).json({
      message: 'OTP sent successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// Optional compatibility endpoint for requesting OTP.
export const requestLoginCode = async (req, res, next) => {
  try {
    const result = await sendLoginCodeToUser(req.body);

    return res.status(200).json({
      message: 'OTP sent successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

// Teacher/Student login step 2: email + code -> JWT.
export const verifyLoginCodeController = async (req, res, next) => {
  try {
    const result = await verifyLoginCodeAndGenerateToken(req.body);

    return res.status(200).json({
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const googleOAuthCallback = async (req, res, next) => {
  try {
    const organization = await handleGoogleOAuthCallback(req.user);

    const responseData = {
      id: organization.id,
      Name: organization.Name,
      Email: organization.Email,
      Role: organization.Role,
      status: organization.status,
      oauthProvider: organization.oauthProvider,
    };

    return res.status(200).json({
      message:
        organization.status === 'PENDING'
          ? 'OAuth registration successful. Your organization is pending admin approval.'
          : 'Organization already registered',
      data: responseData,
    });
  } catch (error) {
    return next(error);
  }
};
