import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { checkFeature } from '../middlewares/checkFeature.js';
import { askChatbotController } from '../controllers/chatbotController.js';

const router = Router();

router.use(authMiddleware);
router.post('/ask', checkFeature('AI_CHAT'), askChatbotController);

export default router;
