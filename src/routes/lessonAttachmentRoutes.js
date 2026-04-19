import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacherOrOrganization } from '../middlewares/isTeacherOrOrganization.js';
import {
  uploadLessonAttachmentController,
  listLessonAttachmentsController,
  deleteLessonAttachmentController,
} from '../controllers/lessonAttachmentController.js';

const router = Router({ mergeParams: true });

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
}).single('file');

router.use(authMiddleware);

router.get('/', listLessonAttachmentsController);
router.post('/', isTeacherOrOrganization, attachmentUpload, uploadLessonAttachmentController);
router.delete('/:attachmentId', isTeacherOrOrganization, deleteLessonAttachmentController);

export default router;
