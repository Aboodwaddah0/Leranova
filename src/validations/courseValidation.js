import Joi from 'joi';

export const createCourseSchema = Joi.object({
  Name: Joi.string().max(255).required(),
  Description: Joi.string().allow('', null),
  Thumbnail: Joi.string().uri().allow('', null),
  Start: Joi.date().iso().allow(null),
  End: Joi.date().iso().allow(null),
});

export const updateCourseSchema = Joi.object({
  Name: Joi.string().max(255),
  Description: Joi.string().allow('', null),
  Thumbnail: Joi.string().uri().allow('', null),
  Start: Joi.date().iso().allow(null),
  End: Joi.date().iso().allow(null),
}).min(1);

