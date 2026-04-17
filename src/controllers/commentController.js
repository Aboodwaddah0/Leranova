import {
	lessonIdParamSchema,
	commentIdParamSchema,
	createCommentSchema,
} from '../validations/commentValidation.js';
import {
	createComment,
	getCommentsByLessonId,
	deleteComment,
} from '../services/commentService.js';
import AppError from '../utils/appError.js';

/**
 * Parse lesson ID from request params
 */
const parseLessonId = (req) => {
	const lessonId = Number(req.params.lessonId);
	const { error } = lessonIdParamSchema.validate({ lessonId });

	if (error) {
		throw new AppError(error.details[0].message, 400);
	}

	return lessonId;
};

/**
 * Parse comment ID from request params
 */
const parseCommentId = (req) => {
	const commentId = Number(req.params.commentId);
	const { error } = commentIdParamSchema.validate({ commentId });

	if (error) {
		throw new AppError(error.details[0].message, 400);
	}

	return commentId;
};

/**
 * Create a new comment on a lesson
 * POST /api/lessons/:lessonId/comments
 */
export const createCommentController = async (req, res, next) => {
	try {
		const lessonId = parseLessonId(req);
		const { error, value } = createCommentSchema.validate(req.body);

		console.log('[COMMENTS][CONTROLLER] Incoming create request', {
			method: req.method,
			path: req.originalUrl,
			lesson_id: lessonId,
			user_id: req.user?.id || null,
			content_preview: String(req.body?.content || '').slice(0, 80),
		});

		if (error) {
			console.error('[COMMENTS][CONTROLLER] Validation failed', {
				lesson_id: lessonId,
				user_id: req.user?.id || null,
				error: error.details[0].message,
			});
			return next(new AppError(error.details[0].message, 400));
		}

		const comment = await createComment(req.user.id, lessonId, value.content);

		console.log('[COMMENTS][CONTROLLER] Create succeeded', {
			lesson_id: lessonId,
			user_id: req.user?.id || null,
			comment_id: comment.id,
		});

		return res.status(201).json({
			message: 'Comment created successfully',
			data: comment,
		});
	} catch (error) {
		console.error('[COMMENTS][CONTROLLER] Create failed', {
			lesson_id: Number(req.params.lessonId),
			user_id: req.user?.id || null,
			message: error.message,
			statusCode: error.statusCode || 500,
		});
		return next(error);
	}
};

/**
 * Get all comments for a lesson
 * GET /api/lessons/:lessonId/comments
 */
export const getCommentsController = async (req, res, next) => {
	try {
		const lessonId = parseLessonId(req);
		const comments = await getCommentsByLessonId(lessonId);

		return res.status(200).json({
			message: 'Comments fetched successfully',
			total: comments.length,
			data: comments,
		});
	} catch (error) {
		return next(error);
	}
};

/**
 * Delete a comment
 * DELETE /api/lessons/:lessonId/comments/:commentId
 */
export const deleteCommentController = async (req, res, next) => {
	try {
		const commentId = parseCommentId(req);

		// Normalize user role to uppercase for comparison
		const userRole = String(req.user.role || '').trim().toUpperCase();

		const result = await deleteComment(req.user.id, userRole, commentId);

		return res.status(200).json({
			message: result.message,
			data: result,
		});
	} catch (error) {
		return next(error);
	}
};
