import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import { chatbotRateLimiter } from '../middlewares/rateLimiter.js';
import { askOrgAIController } from '../controllers/orgAIController.js';

const router = Router();

router.use(authMiddleware);
router.use(isOrganization);
router.post('/ask', chatbotRateLimiter, askOrgAIController);

export default router;
