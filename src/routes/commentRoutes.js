import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isStudentOrOrganization } from '../middlewares/isStudentOrOrganization.js';
import {
	createCommentController,
	getCommentsController,
	deleteCommentController,
} from '../controllers/commentController.js';

const router = Router({ mergeParams: true });

/**
 * POST /api/lessons/:lessonId/comments
 * Create a new comment on a lesson
 * Authorization: STUDENT or ORGANIZATION (ACADEMY/SCHOOL) only
 */
router.post('/', authMiddleware, isStudentOrOrganization, createCommentController);

/**
 * GET /api/lessons/:lessonId/comments
 * Get all comments for a lesson
 * Authorization: All authenticated users
 */
router.get('/', authMiddleware, getCommentsController);

/**
 * DELETE /api/lessons/:lessonId/comments/:commentId
 * Delete a comment (creator or organization admin only)
 * Authorization: Comment creator or lesson-owning organization
 */
router.delete('/:commentId', authMiddleware, isStudentOrOrganization, deleteCommentController);

export default router;
