import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacher } from '../middlewares/isTeacher.js';
import {
  uploadLessonAttachmentController,
  listLessonAttachmentsController,
  deleteLessonAttachmentController,
  getLessonRagStatusController,
  retriggerRagController,
} from '../controllers/lessonAttachmentController.js';

const router = Router({ mergeParams: true });

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
}).array('files', 20);

router.use(authMiddleware);

router.get('/', listLessonAttachmentsController);
router.get('/rag-status', getLessonRagStatusController);
router.post('/reprocess', isTeacher, retriggerRagController);
router.post('/', isTeacher, attachmentUpload, uploadLessonAttachmentController);
router.delete('/:attachmentId', isTeacher, deleteLessonAttachmentController);

export default router;
