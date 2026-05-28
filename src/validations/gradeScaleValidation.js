import Joi from 'joi';

const rangeSchema = Joi.object({
  grade: Joi.string().min(1).max(10).required(),
  minScore: Joi.number().min(0).max(100).required(),
  maxScore: Joi.number().min(0).max(100).required(),
  gpaPoints: Joi.number().min(0).max(4).allow(null).default(null),
  isPassing: Joi.boolean().default(true),
});

export const upsertGradeScaleSchema = Joi.object({
  name: Joi.string().min(1).max(100).default('Standard'),
  ranges: Joi.array().items(rangeSchema).min(1).required(),
});
