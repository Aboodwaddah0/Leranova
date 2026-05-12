import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { ensureLessonAccess } from '../middlewares/ensureLessonAccess.js';
import {
  getOrGenerateLessonAiContent,
  regenerateLessonAiContent,
  regenerateFlashcardsController,
  regenerateMindmapController,
  publishAiContentController,
  unpublishAiContentController,
  updateFlashcardsController,
  updateMindmapController,
} from '../controllers/aiContentController.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// Any authenticated user with lesson access (GET returns draft-aware response based on role)
router.get('/', ensureLessonAccess, getOrGenerateLessonAiContent);

// Teacher-only: generation
router.post('/regenerate',            ensureLessonAccess, regenerateLessonAiContent);
router.post('/flashcards/regenerate', ensureLessonAccess, regenerateFlashcardsController);
router.post('/mindmap/regenerate',    ensureLessonAccess, regenerateMindmapController);

// Teacher-only: edit
router.put('/flashcards', ensureLessonAccess, updateFlashcardsController);
router.put('/mindmap',    ensureLessonAccess, updateMindmapController);

// Teacher-only: publish workflow
router.patch('/publish',   ensureLessonAccess, publishAiContentController);
router.patch('/unpublish', ensureLessonAccess, unpublishAiContentController);

export default router;
