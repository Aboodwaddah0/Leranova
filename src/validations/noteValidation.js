import Joi from 'joi';

export const createNoteSchema = Joi.object({
  studentId: Joi.number().integer().positive().required(),
  title: Joi.string().max(255).allow('', null),
  content: Joi.string().max(4000).required(),
});
