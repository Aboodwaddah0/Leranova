import Joi from 'joi';

const VALID_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

export const createSubjectSchema = Joi.object({
  Course_id: Joi.number().integer().positive().required(),
  Teacher_id: Joi.number().integer().positive(),
  courseId: Joi.number().integer().positive(),
  teacherId: Joi.number().integer().positive(),
  name: Joi.string().max(255).required(),
  level: Joi.string().valid(...VALID_LEVELS).allow('', null).default(null),
  isPaid: Joi.boolean().truthy('true', 1, 'on').falsy('false', 0, 'off').default(false),
  price: Joi.number().min(0).default(0),
  imageUrl: Joi.string().uri().max(500).allow('', null),
  Description: Joi.string().allow('', null),
});

export const updateSubjectSchema = Joi.object({
  Course_id: Joi.number().integer().positive(),
  Teacher_id: Joi.number().integer().positive(),
  courseId: Joi.number().integer().positive(),
  teacherId: Joi.number().integer().positive(),
  name: Joi.string().max(255),
  level: Joi.string().valid(...VALID_LEVELS).allow('', null),
  isPaid: Joi.boolean().truthy('true', 1, 'on').falsy('false', 0, 'off'),
  price: Joi.number().min(0),
  imageUrl: Joi.string().uri().max(500).allow('', null),
  Description: Joi.string().allow('', null),
}).min(1);

