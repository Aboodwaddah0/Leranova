import { Router } from 'express';
import multer from 'multer';
import AppError from '../utils/appError.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import { uploadLessonAssetController } from '../controllers/lessonRagAssetController.js';

const router = Router({ mergeParams: true });

const lessonAssetUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const mimeType = String(file.mimetype || '').toLowerCase();
    const allowedMimeTypes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]);

    if (!allowedMimeTypes.has(mimeType)) {
      callback(new AppError('Only pdf, docx, and txt files are allowed', 400));
      return;
    }

    callback(null, true);
  },
}).single('file');

router.use(authMiddleware, isOrganization);

router.post('/', lessonAssetUpload, uploadLessonAssetController);

export default router;
