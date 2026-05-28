import Joi from 'joi';

export const createComponentSchema = Joi.object({
  subjectId: Joi.number().integer().positive().allow(null).default(null),
  termId: Joi.number().integer().positive().allow(null).default(null),
  name: Joi.string().min(1).max(100).required(),
  weight: Joi.number().min(0.01).max(100).required(),
  maxScore: Joi.number().min(1).max(10000).default(100),
});

export const updateComponentSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  weight: Joi.number().min(0.01).max(100),
  maxScore: Joi.number().min(1).max(10000),
}).min(1);
