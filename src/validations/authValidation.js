import Joi from 'joi';

const registerSchema = Joi.object({
  Name: Joi.string().required(),
  age: Joi.number().integer().min(1).optional(),
  Gender: Joi.string().valid('Male', 'Female').optional(),
  Email: Joi.string().email().required(),
  Password: Joi.string().min(6).required(),
  Address: Joi.string().optional(),
  Role: Joi.string().valid('Student', 'Parent', 'Admin', 'Academy', 'Teacher').required(),
});

const loginSchema = Joi.object({
  Email: Joi.string().email().required(),
  Password: Joi.string().required(),
});

export { registerSchema, loginSchema };
