import Joi from 'joi';

export const createTeacherSchema = Joi.object({
  name: Joi.string().max(255).required(),
  email: Joi.string().email().max(255).required(),
  phone: Joi.string().max(50).allow('', null),
  age: Joi.number().integer().min(0).allow(null),
  gender: Joi.string().valid('FEMALE', 'MALE').allow(null),
  address: Joi.string().max(255).allow('', null),
  work: Joi.string().max(255).allow('', null),
  specialization: Joi.string().max(255).allow('', null),
  bio: Joi.string().allow('', null),
});

export const updateTeacherSchema = Joi.object({
  phone: Joi.string().max(50).allow('', null),
  work: Joi.string().max(255).allow('', null),
  specialization: Joi.string().max(255).allow('', null),
  bio: Joi.string().allow('', null),
  password: Joi.string().min(8),
  age: Joi.number().integer().min(0).allow(null),
  gender: Joi.string().valid('FEMALE', 'MALE').allow(null),
  address: Joi.string().max(255).allow('', null),
}).min(1);

export const updateMyTeacherProfileSchema = Joi.object({
  name:           Joi.string().max(255),
  phone:          Joi.string().max(50).allow('', null),
  gender:         Joi.string().valid('FEMALE', 'MALE').allow(null),
  age:            Joi.number().integer().min(0).allow(null),
  address:        Joi.string().max(255).allow('', null),
  work:           Joi.string().max(255).allow('', null),
  specialization: Joi.string().max(255).allow('', null),
  bio:            Joi.string().allow('', null),
  password:       Joi.string().min(8),
}).min(1);

export const teacherListQuerySchema = Joi.object({
  search: Joi.string().max(255).allow(''),
});

export const teacherLessonsQuerySchema = Joi.object({
  Subject_id: Joi.number().integer().positive(),
});

export const teacherStudentsQuerySchema = Joi.object({
  Course_id: Joi.number().integer().positive(),
  Subject_id: Joi.number().integer().positive(),
  search: Joi.string().max(255).allow(''),
});
