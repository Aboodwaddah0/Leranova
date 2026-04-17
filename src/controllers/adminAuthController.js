import { loginAdmin } from '../services/adminAuthService.js';

export const loginAdminController = async (req, res, next) => {
  try {
    const result = await loginAdmin(req.body);

    return res.status(200).json({
      message: 'Admin login successful',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};
