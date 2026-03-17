import { Router } from 'express';
import multer from 'multer';
import AppError from '../utils/appError.js';
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

const videoUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 200 * 1024 * 1024,
	},
	fileFilter: (req, file, callback) => {
		if (!String(file.mimetype || '').startsWith('video/')) {
			callback(new AppError('Only video files are allowed', 400));
			return;
		}

		callback(null, true);
	},
}).single('video');

router.use(authMiddleware, isOrganization);

router.post('/', videoUpload, createLessonController);
router.get('/', getLessonsController);
router.get('/:lessonId', getLessonByIdController);
router.patch('/:lessonId', videoUpload, updateLessonController);
router.delete('/:lessonId', deleteLessonController);

export default router;
