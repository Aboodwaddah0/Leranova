import Joi from 'joi';

const createOrgSchema = Joi.object({
  Name: Joi.string().required(),
  Email: Joi.string().email().required(),
  Password: Joi.string().min(6).required(),
  Phone: Joi.string().optional(),
  Founded: Joi.date().optional(),
  Address: Joi.string().optional(),
  PhoneNumber: Joi.string().optional(),
  Description: Joi.string().optional(),
  Role: Joi.string().valid('Academy', 'School').required(),
});

const updateOrgSchema = Joi.object({
  Name: Joi.string().optional(),
  Phone: Joi.string().optional(),
  Founded: Joi.date().optional(),
  Address: Joi.string().optional(),
  PhoneNumber: Joi.string().optional(),
  Description: Joi.string().optional(),
});

export { createOrgSchema, updateOrgSchema };
