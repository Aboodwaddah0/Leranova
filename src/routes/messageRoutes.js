import { Router } from 'express';
import { getChatMessages, sendMessage, deleteMessage } from '../controllers/messageController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/chat/:chatId', getChatMessages);
router.post('/', sendMessage);
router.delete('/:id', deleteMessage);

export default router;
