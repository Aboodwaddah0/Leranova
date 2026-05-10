import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getParentChildrenController,
  getParentNotesController,
  markNoteReadController,
  getParentMarksController,
  getMyParentProfileController,
  updateMyParentProfileController,
} from '../controllers/noteController.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', getMyParentProfileController);
router.patch('/me', updateMyParentProfileController);
router.get('/children', getParentChildrenController);
router.get('/notes', getParentNotesController);
router.patch('/notes/:noteId/read', markNoteReadController);
router.get('/marks', getParentMarksController);

export default router;
