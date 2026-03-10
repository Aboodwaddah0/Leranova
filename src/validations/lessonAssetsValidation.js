import Joi from 'joi';

const createAssetSchema = Joi.object({
  Lesson_id: Joi.number().integer().required(),
  Name: Joi.string().required(),
  Description: Joi.string().optional(),
  Url: Joi.string().uri().optional(),
  Files: Joi.string().optional(),
});

const updateAssetSchema = Joi.object({
  Name: Joi.string().optional(),
  Description: Joi.string().optional(),
  Url: Joi.string().uri().optional(),
  Files: Joi.string().optional(),
});

export { createAssetSchema, updateAssetSchema };
