import Joi from 'joi';

export const registerOrganizationSchema = Joi.object({
  Name: Joi.string().max(255).required(),
  Email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).required(),
  Role: Joi.string().valid('Academy', 'School').required(),
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
