import { Router } from 'express';
import { getCommentsByLesson, createComment, deleteComment } from '../controllers/commentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/lesson/:lessonId', getCommentsByLesson);
router.post('/', createComment);
router.delete('/:id', deleteComment);

export default router;
