import Joi from 'joi';

export const createSubjectSchema = Joi.object({
  Course_id: Joi.number().integer().positive().required(),
  Teacher_id: Joi.number().integer().positive(),
  courseId: Joi.number().integer().positive(),
  teacherId: Joi.number().integer().positive(),
  name: Joi.string().max(255).required(),
  isPaid: Joi.boolean().default(false),
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
  isPaid: Joi.boolean(),
  price: Joi.number().min(0),
  imageUrl: Joi.string().uri().max(500).allow('', null),
  Description: Joi.string().allow('', null),
}).min(1);

