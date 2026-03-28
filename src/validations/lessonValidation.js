import Joi from 'joi';

export const subjectIdParamSchema = Joi.object({
	subjectId: Joi.number().integer().positive().required(),
});

export const lessonIdParamSchema = Joi.object({
	lessonId: Joi.number().integer().positive().required(),
});

export const attachmentIdParamSchema = Joi.object({
	attachmentId: Joi.number().integer().positive().required(),
});

export const createLessonSchema = Joi.object({
	title: Joi.string().max(255).required(),
	description: Joi.string().allow('', null),
});

export const updateLessonSchema = Joi.object({
	title: Joi.string().max(255),
	description: Joi.string().allow('', null),
}).min(1);
