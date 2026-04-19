import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getSubjectProgressSummaryController,
  upsertLessonProgressController,
} from '../controllers/lessonProgressController.js';

const router = Router();

router.use(authMiddleware);

router.put('/:lessonId', upsertLessonProgressController);
router.get('/subject/:subjectId', getSubjectProgressSummaryController);

export default router;
