import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
	createLessonController,
	getLessonsController,
	getLessonByIdController,
	updateLessonController,
	deleteLessonController,
} from '../controllers/lessonController.js';

const router = Router({ mergeParams: true });

const lessonUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 500 * 1024 * 1024,
	},
});

router.use(authMiddleware, isOrganization);

router.post('/', lessonUpload.single('video'), createLessonController);
router.get('/', getLessonsController);
router.get('/:lessonId', getLessonByIdController);
router.patch('/:lessonId', lessonUpload.single('video'), updateLessonController);
router.delete('/:lessonId', deleteLessonController);

export default router;
