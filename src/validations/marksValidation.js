import Joi from 'joi';

const createMarkSchema = Joi.object({
  User_id: Joi.number().integer().required(),
  Subject_id: Joi.number().integer().required(),
  Numbers: Joi.number().precision(2).required(),
  time: Joi.date().optional(),
});

export { createMarkSchema };
