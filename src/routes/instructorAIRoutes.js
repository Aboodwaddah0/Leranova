import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacher } from '../middlewares/isTeacher.js';
import { chatbotRateLimiter } from '../middlewares/rateLimiter.js';
import { askInstructorAIController } from '../controllers/instructorAIController.js';

const router = Router();

router.use(authMiddleware);
router.use(isTeacher);
router.post('/ask', chatbotRateLimiter, askInstructorAIController);

export default router;
