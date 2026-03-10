import Joi from 'joi';

const createCourseSchema = Joi.object({
  Org_id: Joi.number().integer().required(),
  Name: Joi.string().required(),
  Description: Joi.string().optional(),
  Thumbnail: Joi.string().optional(),
  Start: Joi.date().optional(),
  End: Joi.date().optional(),
});

const updateCourseSchema = Joi.object({
  Name: Joi.string().optional(),
  Description: Joi.string().optional(),
  Thumbnail: Joi.string().optional(),
  Start: Joi.date().optional(),
  End: Joi.date().optional(),
});

export { createCourseSchema, updateCourseSchema };
