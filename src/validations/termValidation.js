import Joi from 'joi';

export const createTermSchema = Joi.object({
  termNumber: Joi.number().integer().min(1).required(),
  name: Joi.string().trim().min(1).max(100).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
});

export const updateTermSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  changeReason: Joi.string().trim().min(3).max(500).required(),
}).min(2); // at least changeReason + one field to change

export const reopenTermSchema = Joi.object({
  changeReason: Joi.string().trim().min(3).max(500).required(),
});
