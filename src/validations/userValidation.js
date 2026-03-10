import Joi from 'joi';

const updateUserSchema = Joi.object({
  Name: Joi.string().optional(),
  age: Joi.number().integer().min(1).optional(),
  Gender: Joi.string().valid('Male', 'Female').optional(),
  Address: Joi.string().optional(),
});

export { updateUserSchema };
