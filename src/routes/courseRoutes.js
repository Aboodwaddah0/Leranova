import { Router } from 'express';
import multer from 'multer';
import {
  createCourseController,
  getCoursesController,
  getCourseByIdController,
  updateCourseController,
  deleteCourseController,
} from '../controllers/courseController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import AppError from '../utils/appError.js';

const router = Router();
const courseImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const fileName = String(file?.originalname || '').toLowerCase();
    const hasImageExtension = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some((ext) => fileName.endsWith(ext));

    if (!allowedTypes.has(file.mimetype) && !hasImageExtension) {
      callback(new Error('Only image files are allowed for course thumbnails'));
      return;
    }

    callback(null, true);
  },
}).single('thumbnail');

const courseImageUploadMiddleware = (req, res, next) => {
  courseImageUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('Thumbnail image must be 5MB or less', 400));
      return;
    }

    next(new AppError(error.message || 'Invalid thumbnail upload', 400));
  });
};

router.use(authMiddleware, isOrganization);

router.post('/', courseImageUploadMiddleware, createCourseController);
router.get('/', getCoursesController);
router.get('/:id', getCourseByIdController);
router.patch('/:id', courseImageUploadMiddleware, updateCourseController);
router.delete('/:id', deleteCourseController);

export default router;

