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
  deleteFlashcardsController,
  deleteMindmapController,
  generatePowerSlidesController,
  deletePowerSlidesController,
  generateScenePlanController,
} from '../controllers/aiContentController.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', ensureLessonAccess, getOrGenerateLessonAiContent);

router.post('/regenerate',            ensureLessonAccess, regenerateLessonAiContent);
router.post('/flashcards/regenerate', ensureLessonAccess, regenerateFlashcardsController);
router.post('/mindmap/regenerate',    ensureLessonAccess, regenerateMindmapController);

router.put('/flashcards',    ensureLessonAccess, updateFlashcardsController);
router.put('/mindmap',       ensureLessonAccess, updateMindmapController);
router.delete('/flashcards', ensureLessonAccess, deleteFlashcardsController);
router.delete('/mindmap',    ensureLessonAccess, deleteMindmapController);

router.post('/slides/generate',        ensureLessonAccess, generatePowerSlidesController);
router.delete('/slides',               ensureLessonAccess, deletePowerSlidesController);

router.post('/scenes/plan', ensureLessonAccess, generateScenePlanController);

router.patch('/publish',   ensureLessonAccess, publishAiContentController);
router.patch('/unpublish', ensureLessonAccess, unpublishAiContentController);

export default router;
