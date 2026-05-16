import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacher } from '../middlewares/isTeacher.js';
import {
	createLessonController,
	getLessonsController,
	getLessonByIdController,
	updateLessonController,
	deleteLessonController,
	suggestLessonMetadataController,
	suggestFromContentController,
} from '../controllers/lessonController.js';
import { ensureLessonAccess } from '../middlewares/ensureLessonAccess.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

const lessonUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 500 * 1024 * 1024,
	},
});
router.get('/', getLessonsController);
router.post('/suggest', isTeacher, suggestLessonMetadataController);
router.post('/:lessonId/suggest-from-content', isTeacher, suggestFromContentController);
router.get('/:lessonId', ensureLessonAccess, getLessonByIdController);
router.post('/', isTeacher, lessonUpload.single('video'), createLessonController);
router.patch('/:lessonId', isTeacher, lessonUpload.single('video'), updateLessonController);
router.delete('/:lessonId', isTeacher, deleteLessonController);

export default router;
