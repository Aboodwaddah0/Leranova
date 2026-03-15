import {
  registerOrganization,
  loginOrganization,
  loginUser,
} from '../services/authService.js';
import {
  registerOrganizationSchema,
  loginOrganizationSchema,
} from '../validations/authValidation.js';
import AppError from '../utils/appError.js';

 export const register = async (req, res,next) => {
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

export const loginUserController=async (req,res,next)=>{
  try{
     const result = await loginUser(req.body);
      return res.status(200).json({
      message: 'User logged in successfully',
      data: result,
    });
  }catch (error){
      return next(error);
  }
}





