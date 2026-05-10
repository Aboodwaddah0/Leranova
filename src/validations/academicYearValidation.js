import Joi from 'joi';

export const createAcademicYearSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  numberOfTerms: Joi.number().integer().min(1).max(4).default(1),
});

export const updateAcademicYearSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  endDate: Joi.date().iso(),
  numberOfTerms: Joi.number().integer().min(1).max(4),
}).min(1);
