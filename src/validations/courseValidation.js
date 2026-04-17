import Joi from 'joi';

export const createCourseSchema = Joi.object({
  Name: Joi.string().max(255).required(),
  Description: Joi.string().allow('', null),
  Thumbnail: Joi.string().uri().allow('', null),
  Start: Joi.date().iso().allow(null),
  End: Joi.date().iso().allow(null),
  price: Joi.number().min(0).precision(2).default(0),
  isPaid: Joi.boolean().default(false),
});

export const updateCourseSchema = Joi.object({
  Name: Joi.string().max(255),
  Description: Joi.string().allow('', null),
  Thumbnail: Joi.string().uri().allow('', null),
  Start: Joi.date().iso().allow(null),
  End: Joi.date().iso().allow(null),
  price: Joi.number().min(0).precision(2),
  isPaid: Joi.boolean(),
}).min(1);

