import Joi from 'joi';

export const updateMyParentProfileSchema = Joi.object({
  name:     Joi.string().max(255),
  gender:   Joi.string().valid('FEMALE', 'MALE').allow(null),
  age:      Joi.number().integer().min(0).allow(null),
  address:  Joi.string().max(255).allow('', null),
  password: Joi.string().min(8),
}).min(1);
