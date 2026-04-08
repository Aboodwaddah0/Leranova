import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacherOrOrganization } from '../middlewares/isTeacherOrOrganization.js';
import {
	createLessonController,
	getLessonsController,
	getLessonByIdController,
	updateLessonController,
	deleteLessonController,
} from '../controllers/lessonController.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware, isTeacherOrOrganization);

router.post('/', createLessonController);
router.get('/', getLessonsController);
router.get('/:lessonId', getLessonByIdController);
router.patch('/:lessonId', updateLessonController);
router.delete('/:lessonId', deleteLessonController);

export default router;
