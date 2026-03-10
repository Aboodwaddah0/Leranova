import { Router } from 'express';
import { getUserChats, getChatById, createChat } from '../controllers/chatController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getUserChats);
router.get('/:id', getChatById);
router.post('/', createChat);

export default router;
