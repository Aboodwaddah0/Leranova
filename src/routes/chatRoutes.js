import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { checkFeature } from '../middlewares/checkFeature.js';
import {
  listTeacherChats,
  listStudentChats,
  listStudentChatMessages,
  sendStudentChatMessage,
  deleteStudentMessage,
  editStudentMessage,
  reactStudentMessage,
  sendMessage,
  sendMessageAutoChat,
  sendCourseMessage,
  getCourseMessages,
  getCourseChatInfo,
  deleteCourseMessage,
  clearCourseChat,
  markCourseMessageSeen,
  courseTyping,
  getMessages,
  getChatDetails,
  softDeleteMessage,
  clearChat,
} from '../controllers/chatController.js';

const router = express.Router();

const chatFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
});

const studentOnly = (req, _res, next) => {
  if (String(req.user?.role || '').toUpperCase() !== 'STUDENT') {
    return next('route');
  }
  return next();
};

const teacherOnly = (req, _res, next) => {
  if (String(req.user?.role || '').toUpperCase() !== 'TEACHER') {
    return next('route');
  }
  return next();
};

// Student routes (fall through to teacher if not student)
router.get('/', authMiddleware, studentOnly, listStudentChats);
// Teacher routes (fall through if not teacher)
router.get('/', authMiddleware, teacherOnly, listTeacherChats);

router.delete('/messages/:messageId', authMiddleware, studentOnly, deleteStudentMessage);
router.patch('/messages/:messageId', authMiddleware, studentOnly, editStudentMessage);
router.patch('/messages/:messageId/reaction', authMiddleware, studentOnly, reactStudentMessage);

// Messages — accessible by both students AND teachers
router.get('/:chatId/messages', authMiddleware, listStudentChatMessages);
router.post('/:chatId/messages', authMiddleware, chatFileUpload.array('files', 5), sendStudentChatMessage);
router.delete('/:chatId/messages/:messageId', authMiddleware, softDeleteMessage);
router.delete('/:chatId/clear', authMiddleware, clearChat);

/**
 * =========================
 * 🔥 COURSE CHAT (NO FEATURE FLAG)
 * =========================
 */

// Send message to course chat
router.post('/course/messages', authMiddleware, sendCourseMessage);

// Get course messages
router.get('/course/:course_id/messages', authMiddleware, getCourseMessages);

// Get course chat info
router.get('/course/:course_id', authMiddleware, getCourseChatInfo);

// Delete message
router.delete('/course/message/:id', authMiddleware, deleteCourseMessage);

// Clear course chat
router.delete('/course/:course_id/clear', authMiddleware, clearCourseChat);

// Seen
router.post('/course/seen', authMiddleware, markCourseMessageSeen);

// Typing
router.post('/course/typing', authMiddleware, courseTyping);


/**
 * =========================
 * 🤖 CHATBOT / PRIVATE CHAT (WITH FEATURE FLAG)
 * =========================
 */

// Auto chat
router.post('/messages', authMiddleware, checkFeature('GROUP_CHAT'), sendMessageAutoChat);

// Chat details
router.get('/:chatId', authMiddleware, checkFeature('GROUP_CHAT'), getChatDetails);

// Messages list
router.get('/:chatId/messages', authMiddleware, checkFeature('GROUP_CHAT'), getMessages);

// Send message
router.post('/:chatId/messages', authMiddleware, checkFeature('GROUP_CHAT'), sendMessage);

// Delete message
router.delete('/:chatId/messages/:messageId', authMiddleware, checkFeature('GROUP_CHAT'), softDeleteMessage);

// Clear chat
router.delete('/:chatId/clear', authMiddleware, checkFeature('GROUP_CHAT'), clearChat);

export default router;