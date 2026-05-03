import Joi from 'joi';

export const createCourseSchema = Joi.object({
  Name: Joi.string().max(255).required(),
  Description: Joi.string().allow('', null),
  Thumbnail: Joi.string().allow('', null),
  thumbnail: Joi.any().strip(),
  Teacher_id: Joi.number().integer().positive().allow(null),
  teacherId: Joi.number().integer().positive().allow(null),
  // price/isPaid are ignored at course level — payment is per-subject
  price: Joi.any().strip(),
  isPaid: Joi.any().strip(),
  GradeLevel: Joi.number().integer().min(1).max(12).allow(null),
});

export const updateCourseSchema = Joi.object({
  Name: Joi.string().max(255),
  Description: Joi.string().allow('', null),
  Thumbnail: Joi.string().allow('', null),
  thumbnail: Joi.any().strip(),
  Teacher_id: Joi.number().integer().positive().allow(null),
  teacherId: Joi.number().integer().positive().allow(null),
  // price/isPaid are ignored at course level — payment is per-subject
  price: Joi.any().strip(),
  isPaid: Joi.any().strip(),
  GradeLevel: Joi.number().integer().min(1).max(12).allow(null),
}).min(1);

