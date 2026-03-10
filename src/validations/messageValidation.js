import Joi from 'joi';

const sendMessageSchema = Joi.object({
  chat_id: Joi.number().integer().required(),
  content: Joi.string().required(),
  message_type: Joi.string().valid('text', 'image', 'file').optional(),
});

export { sendMessageSchema };
