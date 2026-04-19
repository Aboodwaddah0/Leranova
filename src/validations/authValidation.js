import Joi from 'joi';

const subdomainPattern = /^[a-z0-9-]+$/;

export const registerOrganizationSchema = Joi.object({
  Name: Joi.string().max(255).required(),
  subdomain: Joi.string().trim().lowercase().max(63).pattern(subdomainPattern).required(),
  Email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).required(),
  Role: Joi.string().valid('ACADEMY', 'SCHOOL', 'Academy', 'School').required(),
  planId: Joi.number().integer().positive().optional().allow(null),
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

export const loginUserSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().required(),
  role: Joi.string().valid('STUDENT', 'TEACHER', 'INSTRUCTOR', 'ADMIN').optional(),
});

export const loginParentSchema = Joi.object({
  nationalId: Joi.string().trim().min(5).max(50).required(),
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

export const changePasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).required(),
});
