import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { askChatbotController } from '../controllers/chatbotController.js';
import { chatbotRateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.use(authMiddleware);
router.post('/ask', chatbotRateLimiter, askChatbotController);

export default router;
