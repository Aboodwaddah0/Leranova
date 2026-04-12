import Joi from 'joi';

export const createFeatureSchema = Joi.object({
  featureKey: Joi.string()
    .trim()
    .max(100)
    .pattern(/^[A-Za-z0-9_]+$/)
    .required(),
  name: Joi.string().trim().max(255).required(),
  description: Joi.string().allow('', null).max(10000),
  hasLimit: Joi.boolean().default(false),
  defaultLimit: Joi.number().integer().positive().allow(null),
});

export const updateFeatureSchema = Joi.object({
  featureKey: Joi.string().trim().max(100).pattern(/^[A-Za-z0-9_]+$/),
  name: Joi.string().trim().max(255),
  description: Joi.string().allow('', null).max(10000),
  hasLimit: Joi.boolean(),
  defaultLimit: Joi.number().integer().positive().allow(null),
}).min(1);

export const assignPlanFeatureSchema = Joi.object({
  featureId: Joi.number().integer().positive().required(),
  featureLimit: Joi.number().integer().positive().allow(null),
});

export const updatePlanFeatureSchema = Joi.object({
  featureLimit: Joi.number().integer().positive().allow(null).required(),
});
