import Joi from 'joi';

const createChatSchema = Joi.object({
  organization_id: Joi.number().integer().required(),
  subject_id: Joi.number().integer().optional(),
  type: Joi.string().valid('private', 'group', 'subject').required(),
  title: Joi.string().optional(),
  participants: Joi.array().items(Joi.number().integer()).min(1).required(),
});

export { createChatSchema };
