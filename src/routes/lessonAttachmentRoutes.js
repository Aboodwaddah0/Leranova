import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
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

router.use(authMiddleware, isOrganization);

router.post('/', attachmentUpload, uploadLessonAttachmentController);
router.get('/', listLessonAttachmentsController);
router.delete('/:attachmentId', deleteLessonAttachmentController);

export default router;
