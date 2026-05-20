import { Router } from 'express';
import multer from 'multer';
import AppError from '../utils/appError.js';
import {
  createSubjectController,
  getSubjectsController,
  getSubjectByIdController,
  updateSubjectController,
  deleteSubjectController,
  uploadSubjectImageController,
} from '../controllers/subjectController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacherOrOrganization } from '../middlewares/isTeacherOrOrganization.js';

const router = Router({ mergeParams: true });

const subjectImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new AppError('Only image files are allowed', 400));
  },
}).single('image');

const handleSubjectImageUpload = (req, res, next) => {
  subjectImageUpload(req, res, (err) => {
    if (err) return next(new AppError(err.message || 'Image upload failed', 400));
    next();
  });
};

router.use(authMiddleware);

router.get('/', getSubjectsController);
router.get('/:subjectId', getSubjectByIdController);
router.post('/', isTeacherOrOrganization, createSubjectController);
router.post('/upload-image', isTeacherOrOrganization, handleSubjectImageUpload, uploadSubjectImageController);
router.patch('/:subjectId', isTeacherOrOrganization, updateSubjectController);
router.delete('/:subjectId', isTeacherOrOrganization, deleteSubjectController);

export default router;

