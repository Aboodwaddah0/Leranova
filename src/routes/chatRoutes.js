import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  sendMessage,
  sendMessageAutoChat,
  getMessages,
  getChatDetails,
  softDeleteMessage,
  clearChat,
} from '../controllers/chatController.js';

const router = express.Router();

/**
 * Chat endpoints
 */

// POST /api/chats/messages - Send message with auto chat find/create
router.post('/messages', authMiddleware, sendMessageAutoChat);

// GET /api/chats/:chatId - Get chat details
router.get('/:chatId', authMiddleware, getChatDetails);

// GET /api/chats/:chatId/messages - Get paginated messages
router.get('/:chatId/messages', authMiddleware, getMessages);

// POST /api/chats/:chatId/messages - Send message (with optional bot reply)
router.post('/:chatId/messages', authMiddleware, sendMessage);

// DELETE /api/chats/:chatId/messages/:messageId - Soft-delete message
router.delete('/:chatId/messages/:messageId', authMiddleware, softDeleteMessage);

// DELETE /api/chats/:chatId/clear - Clear chat messages (soft-delete all)
router.delete('/:chatId/clear', authMiddleware, clearChat);

export default router;
