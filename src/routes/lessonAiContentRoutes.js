import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { ensureLessonAccess } from '../middlewares/ensureLessonAccess.js';
import { getOrGenerateLessonAiContent, regenerateLessonAiContent, regenerateFlashcardsController, regenerateMindmapController } from '../controllers/aiContentController.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.get('/', ensureLessonAccess, getOrGenerateLessonAiContent);
router.post('/regenerate', ensureLessonAccess, regenerateLessonAiContent);
router.post('/flashcards/regenerate', ensureLessonAccess, regenerateFlashcardsController);
router.post('/mindmap/regenerate', ensureLessonAccess, regenerateMindmapController);

export default router;
