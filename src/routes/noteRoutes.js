import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  createNoteController,
  getNotesController,
  deleteNoteController,
} from '../controllers/noteController.js';

const router = Router();

router.use(authMiddleware);

router.post('/', createNoteController);
router.get('/', getNotesController);
router.delete('/:noteId', deleteNoteController);

export default router;
