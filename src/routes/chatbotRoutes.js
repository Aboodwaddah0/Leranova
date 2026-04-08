import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { askChatbotController } from '../controllers/chatbotController.js';

const router = Router();

router.use(authMiddleware);
router.post('/ask', askChatbotController);

export default router;
