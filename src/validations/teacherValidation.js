import Joi from 'joi';

export const createTeacherSchema = Joi.object({
  name: Joi.string().max(255).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).required(),
  age: Joi.number().integer().min(0).allow(null),
  gender: Joi.string().valid('FEMALE', 'MALE').allow(null),
  address: Joi.string().max(255).allow('', null),
  work: Joi.string().max(255).allow('', null),
  specialization: Joi.string().max(255).allow('', null),
  bio: Joi.string().allow('', null),
});

export const updateTeacherSchema = Joi.object({
  work: Joi.string().max(255).allow('', null),
  specialization: Joi.string().max(255).allow('', null),
  bio: Joi.string().allow('', null),
  age: Joi.number().integer().min(0).allow(null),
  gender: Joi.string().valid('FEMALE', 'MALE').allow(null),
  address: Joi.string().max(255).allow('', null),
}).min(1);
