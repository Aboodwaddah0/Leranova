import Joi from 'joi';

const createSubjectSchema = Joi.object({
  Course_id: Joi.number().integer().required(),
  Teacher_id: Joi.number().integer().required(),
  name: Joi.string().required(),
  Description: Joi.string().optional(),
});

const updateSubjectSchema = Joi.object({
  name: Joi.string().optional(),
  Description: Joi.string().optional(),
  Teacher_id: Joi.number().integer().optional(),
});

export { createSubjectSchema, updateSubjectSchema };
