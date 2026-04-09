import Joi from 'joi';

export const createPlanSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  price: Joi.number().positive().precision(2).required(),
  durationDays: Joi.number().integer().positive().required(),
  description: Joi.string().allow('', null).max(10000),
  features: Joi.array().items(Joi.string().trim().max(255)).default([]),
});

export const updatePlanSchema = Joi.object({
  name: Joi.string().trim().max(100),
  price: Joi.number().positive().precision(2),
  durationDays: Joi.number().integer().positive(),
  description: Joi.string().allow('', null).max(10000),
  features: Joi.array().items(Joi.string().trim().max(255)),
}).min(1);
