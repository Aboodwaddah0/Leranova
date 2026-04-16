import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  sendMessage,
  sendMessageAutoChat,
  sendCourseMessage,
  getCourseMessages,
  getCourseChatInfo,
  deleteCourseMessage,
  clearCourseChat,
  getMessages,
  getChatDetails,
  softDeleteMessage,
  clearChat,
} from '../controllers/chatController.js';

const router = express.Router();

/**
 * Chat endpoints
 */

// Chatbot routes
// Course chat routes
// POST /api/chats/course/messages - Send message to course shared chat
router.post('/course/messages', authMiddleware, sendCourseMessage);

// GET /api/chats/course/:course_id/messages - Get course shared chat messages
router.get('/course/:course_id/messages', authMiddleware, getCourseMessages);

// GET /api/chats/course/:course_id - Get course shared chat details
router.get('/course/:course_id', authMiddleware, getCourseChatInfo);

// DELETE /api/chats/course/message/:id - Soft-delete course chat message
router.delete('/course/message/:id', authMiddleware, deleteCourseMessage);

// DELETE /api/chats/course/:course_id/clear - Clear course chat messages
router.delete('/course/:course_id/clear', authMiddleware, clearCourseChat);

// POST /api/chats/messages - Send message with auto chatbot chat find/create
router.post('/messages', authMiddleware, sendMessageAutoChat);

// GET /api/chats/:chatId - Get chatbot chat details
router.get('/:chatId', authMiddleware, getChatDetails);

// GET /api/chats/:chatId/messages - Get paginated chatbot chat messages
router.get('/:chatId/messages', authMiddleware, getMessages);

// POST /api/chats/:chatId/messages - Send message to existing chatbot chat
router.post('/:chatId/messages', authMiddleware, sendMessage);

// DELETE /api/chats/:chatId/messages/:messageId - Soft-delete chatbot message
router.delete('/:chatId/messages/:messageId', authMiddleware, softDeleteMessage);

// DELETE /api/chats/:chatId/clear - Clear chatbot chat messages
router.delete('/:chatId/clear', authMiddleware, clearChat);

export default router;
