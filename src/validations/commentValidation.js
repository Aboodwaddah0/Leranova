import Joi from 'joi';

const createCommentSchema = Joi.object({
  lesson_id: Joi.number().integer().optional(),
  asset_id: Joi.number().integer().optional(),
  content: Joi.string().required(),
});

export { createCommentSchema };
