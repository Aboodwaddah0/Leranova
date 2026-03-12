import Joi from 'joi';

export const createSubjectSchema = Joi.object({
  Course_id: Joi.number().integer().positive().required(),
  Teacher_id: Joi.number().integer().positive().required(),
  name: Joi.string().max(255).required(),
  Description: Joi.string().allow('', null),
});

export const updateSubjectSchema = Joi.object({
  Course_id: Joi.number().integer().positive(),
  Teacher_id: Joi.number().integer().positive(),
  name: Joi.string().max(255),
  Description: Joi.string().allow('', null),
}).min(1);

