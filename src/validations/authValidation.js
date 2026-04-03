import Joi from 'joi';

export const registerOrganizationSchema = Joi.object({
  Name: Joi.string().max(255).required(),
  Email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).required(),
  Role: Joi.string().valid('ACADEMY', 'SCHOOL', 'Academy', 'School').required(),
  Phone: Joi.string().max(50).allow('', null),
  Founded: Joi.date().iso().allow(null),
  Address: Joi.string().max(255).allow('', null),
  PhoneNumber: Joi.string().max(50).allow('', null),
  Description: Joi.string().allow('', null),
});

export const loginOrganizationSchema = Joi.object({
  Email: Joi.string().email().max(255).required(),
  password: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  accountType: Joi.string().valid('USER', 'ORGANIZATION').optional(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().min(20).required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .required()
    .messages({
      'string.pattern.base': 'newPassword must contain uppercase, lowercase, and a number',
    }),
});
