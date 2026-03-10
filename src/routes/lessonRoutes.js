import { Router } from 'express';
import { getAllLessons, getLessonById, createLesson, updateLesson, deleteLesson } from '../controllers/lessonController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllLessons);
router.get('/:id', getLessonById);
router.post('/', createLesson);
router.put('/:id', updateLesson);
router.delete('/:id', deleteLesson);

export default router;
