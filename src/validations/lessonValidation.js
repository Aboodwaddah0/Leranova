import Joi from 'joi';

const createLessonSchema = Joi.object({
  Subject_id: Joi.number().integer().required(),
  name: Joi.string().required(),
});

const updateLessonSchema = Joi.object({
  name: Joi.string().optional(),
});

export { createLessonSchema, updateLessonSchema };
