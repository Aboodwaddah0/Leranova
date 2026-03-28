import Joi from 'joi';

export const createEnrollmentSchema = Joi.object({
  user_Academy_id: Joi.number().integer().positive(),
  studentUserId: Joi.number().integer().positive(),
  Course_id: Joi.number().integer().positive().required(),
}).xor('user_Academy_id', 'studentUserId');

