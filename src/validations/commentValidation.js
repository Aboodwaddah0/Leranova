import Joi from 'joi';

/**
 * Validation schema for lesson ID parameter
 */
export const lessonIdParamSchema = Joi.object({
	lessonId: Joi.number().integer().positive().required(),
});

/**
 * Validation schema for comment ID parameter
 */
export const commentIdParamSchema = Joi.object({
	commentId: Joi.number().integer().positive().required(),
});

/**
 * Validation schema for creating a comment
 */
export const createCommentSchema = Joi.object({
	content: Joi.string().trim().min(1).max(5000).required(),
});

/**
 * Validation schema for updating a comment (if needed in future)
 */
export const updateCommentSchema = Joi.object({
	content: Joi.string().trim().min(1).max(5000).required(),
});
