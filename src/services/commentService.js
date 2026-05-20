import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

/**
 * Serialize comment object to return to client
 */
const serializeComment = (comment) => ({
	id: comment.id,
	lessonId: comment.lesson_id,
	userId: comment.User_id,
	userName: comment.user?.name,
	userRole: comment.user?.role,
	content: comment.content,
	createdAt: comment.time,
});

/**
 * Ensure the lesson exists
 */
export const ensureLessonExists = async (lessonId) => {
	const lesson = await prisma.lesson.findUnique({
		where: {
			id: lessonId,
		},
		select: {
			id: true,
			course: {
				select: {
					track: {
						select: {
							Org_id: true,
						},
					},
				},
			},
		},
	});

	if (!lesson) {
		throw new AppError('Lesson not found', 404);
	}

	return lesson;
};

/**
 * Ensure the comment exists and fetch full details
 */
export const ensureCommentExists = async (commentId) => {
	const comment = await prisma.comment.findUnique({
		where: {
			id: commentId,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					role: true,
				},
			},
		},
	});

	if (!comment) {
		throw new AppError('Comment not found', 404);
	}

	return comment;
};

/**
 * Create a new comment on a lesson
 * @param {number} userId - The user creating the comment
 * @param {number} lessonId - The lesson to comment on
 * @param {string} content - The comment content
 * @returns {Object} The created comment (serialized)
 */
export const createComment = async (userId, lessonId, content) => {
	console.log('[COMMENTS][SERVICE] Create start', {
		lesson_id: lessonId,
		user_id: userId,
		content_length: String(content || '').length,
	});

	// Verify lesson exists
	await ensureLessonExists(lessonId);

	// Get user details for validation
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, name: true, role: true },
	});

	if (!user) {
		throw new AppError('User not found', 404);
	}

	// Create the comment
	const comment = await prisma.comment.create({
		data: {
			lesson_id: lessonId,
			User_id: userId,
			content: content,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					role: true,
				},
			},
		},
	});

	console.log('[COMMENTS][SERVICE] DB insert success', {
		comment_id: comment.id,
		lesson_id: comment.lesson_id,
		user_id: comment.User_id,
		created_at: comment.time,
	});

	return serializeComment(comment);
};

/**
 * Get all comments for a lesson
 * @param {number} lessonId - The lesson ID
 * @returns {Array} Array of comments (serialized)
 */
export const getCommentsByLessonId = async (lessonId) => {
	// Verify lesson exists
	await ensureLessonExists(lessonId);

	const comments = await prisma.comment.findMany({
		where: {
			lesson_id: lessonId,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					role: true,
				},
			},
		},
		orderBy: {
			time: 'asc',
		},
	});

	return comments.map(serializeComment);
};

/**
 * Check if a user can delete a comment
 * Permission granted if:
 * - User is the comment creator (regardless of role), OR
 * - User is an organization admin who owns the lesson
 * @param {number} userId - The user attempting deletion
 * @param {string} userRole - The user's role (STUDENT, ACADEMY, SCHOOL, etc.)
 * @param {Object} comment - The comment object to delete
 * @returns {boolean} Whether the user can delete this comment
 */
export const canDeleteComment = async (userId, userRole, comment) => {
	// Check if user is the comment creator
	if (comment.User_id === userId) {
		return true;
	}

	// Check if user is an organization admin who owns the lesson
	if (['ACADEMY', 'SCHOOL'].includes(userRole)) {
		const lesson = await prisma.lesson.findUnique({
			where: { id: comment.lesson_id },
			select: {
				course: {
					select: {
						track: {
							select: {
								Org_id: true,
							},
						},
					},
				},
			},
		});

		if (lesson && lesson.course.track.Org_id === userId) {
			return true;
		}
	}

	return false;
};

/**
 * Delete a comment with authorization checks
 * @param {number} userId - The user attempting deletion
 * @param {string} userRole - The user's role
 * @param {number} commentId - The comment ID to delete
 * @returns {Object} Deleted comment info
 */
export const deleteComment = async (userId, userRole, commentId) => {
	// Fetch the comment
	const comment = await ensureCommentExists(commentId);

	// Check authorization
	const hasPermission = await canDeleteComment(userId, userRole, comment);
	if (!hasPermission) {
		throw new AppError('You do not have permission to delete this comment', 403);
	}

	// Delete the comment
	await prisma.comment.delete({
		where: { id: commentId },
	});

	return {
		id: commentId,
		message: 'Comment deleted successfully',
	};
};

/**
 * Get a single comment (optional, for internal use)
 */
export const getCommentById = async (commentId) => {
	const comment = await ensureCommentExists(commentId);
	return serializeComment(comment);
};
