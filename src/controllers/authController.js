import {
  registerOrganization,
  loginOrganization,
} from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const result = await registerOrganization(req.body);

    return res.status(201).json({
      message: 'Organization registered successfully and is pending approval',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginOrganization(req.body);

    return res.status(200).json({
      message: 'Organization logged in successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

