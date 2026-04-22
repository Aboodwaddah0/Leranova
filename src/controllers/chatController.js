import Joi from 'joi';
import AppError from '../utils/appError.js';
import {
  getChatWithContext,
  listChatsForStudent,
  listMessagesForStudentChat,
  sendStudentChatTextMessage,
  deleteStudentMessageById,
  editStudentMessageById,
  toggleStudentMessageReaction,
  sendMessageWithBotReply,
  sendMessageWithAutoChat,
  sendCourseChatMessage,
  setCourseMessageSeen,
  setCourseTyping,
  getChatMessages,
  deleteMessage,
  clearChatMessages,
  getCourseChatMessages,
  getCourseChatDetails,
  deleteCourseChatMessage,
  clearCourseChatMessages,
} from '../services/chatService.js';

// Validation schemas
const courseMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
  course_id: Joi.number().integer().positive().required(),
});

const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
  message_type: Joi.string().valid('text', 'image', 'file', 'voice').default('text'),
  replyToMessageId: Joi.number().integer().positive().optional(),
  course_id: Joi.number().integer().positive().optional(),  // For chatbot context
  subject_id: Joi.number().integer().positive().optional(),
  lesson_id: Joi.number().integer().positive().optional(),
  enable_chatbot: Joi.boolean().default(true),  // Control bot reply
});

const getMessagesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const courseMessageQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const courseSeenSchema = Joi.object({
  course_id: Joi.number().integer().positive().required(),
  message_id: Joi.number().integer().positive().required(),
});

const courseTypingSchema = Joi.object({
  course_id: Joi.number().integer().positive().required(),
  is_typing: Joi.boolean().required(),
});

const sendStudentMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
  replyToMessageId: Joi.number().integer().positive().optional(),
});

const editStudentMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
});

const studentReactionSchema = Joi.object({
  reaction: Joi.string().trim().valid('👍', '❤️', '😂', '🔥', '👏', '😮').required(),
});

export const listStudentChats = async (req, res, next) => {
  try {
    const chats = await listChatsForStudent({
      userId: req.user.id,
    });

    return res.status(200).json({
      message: 'Chats retrieved successfully',
      data: chats,
    });
  } catch (error) {
    return next(error);
  }
};

export const listStudentChatMessages = async (req, res, next) => {
  try {
    const chatId = Number(req.params.chatId);
    if (!chatId || Number.isNaN(chatId)) {
      return next(new AppError('Invalid chat ID', 400));
    }

    const messages = await listMessagesForStudentChat({
      chatId,
      userId: req.user.id,
    });

    return res.status(200).json({
      message: 'Chat messages retrieved successfully',
      data: messages,
    });
  } catch (error) {
    return next(error);
  }
};

export const sendStudentChatMessage = async (req, res, next) => {
  try {
    const chatId = Number(req.params.chatId);
    if (!chatId || Number.isNaN(chatId)) {
      return next(new AppError('Invalid chat ID', 400));
    }

    const { error, value } = sendStudentMessageSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const message = await sendStudentChatTextMessage({
      chatId,
      userId: req.user.id,
      content: value.content,
      replyToMessageId: value.replyToMessageId ?? null,
    });

    return res.status(201).json({
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteStudentMessage = async (req, res, next) => {
  try {
    const messageId = Number(req.params.messageId);
    if (!messageId || Number.isNaN(messageId)) {
      return next(new AppError('Invalid message ID', 400));
    }

    await deleteStudentMessageById({
      messageId,
      userId: req.user.id,
    });

    return res.status(200).json({
      message: 'Message deleted successfully',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

export const editStudentMessage = async (req, res, next) => {
  try {
    const messageId = Number(req.params.messageId);
    if (!messageId || Number.isNaN(messageId)) {
      return next(new AppError('Invalid message ID', 400));
    }

    const { error, value } = editStudentMessageSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const message = await editStudentMessageById({
      messageId,
      userId: req.user.id,
      content: value.content,
    });

    return res.status(200).json({
      message: 'Message updated successfully',
      data: message,
    });
  } catch (error) {
    return next(error);
  }
};

export const reactStudentMessage = async (req, res, next) => {
  try {
    const messageId = Number(req.params.messageId);
    if (!messageId || Number.isNaN(messageId)) {
      return next(new AppError('Invalid message ID', 400));
    }

    const { error, value } = studentReactionSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await toggleStudentMessageReaction({
      messageId,
      userId: req.user.id,
      reaction: value.reaction,
    });

    return res.status(200).json({
      message: 'Message reaction updated successfully',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/chats/:chatId/messages
 * Send a message to chat with optional bot reply
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const { chatId } = req.params;
    const userId = req.user.id;

    if (!chatId || isNaN(chatId)) {
      return next(new AppError('Invalid chat ID', 400));
    }

    // Prepare chatbot context if provided
    const chatbotContext = value.course_id ? {
      courseId: value.course_id,
      subjectId: value.subject_id || null,
      lessonId: value.lesson_id || null,
    } : null;

    // Send message and trigger bot
    const result = await sendMessageWithBotReply({
      chatId: Number(chatId),
      userId,
      content: value.content,
      replyToMessageId: value.replyToMessageId ?? null,
      tokenUser: req.user,
      chatbotContext,
      enableChatbot: value.enable_chatbot && !!chatbotContext,
    });

    return res.status(201).json({
      message: 'Message sent successfully',
      data: {
        chat_id: Number(chatId),
        user_message: result.userMessage,
        bot_message: result.botMessage || null,
        chatbot_response: result.chatbotResponse || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/chats/messages
 * Send a course message by course_id
 */
export const sendMessageAutoChat = async (req, res, next) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    if (!value.course_id) {
      return next(new AppError('course_id is required', 400));
    }

    const userId = req.user.id;

    const result = await sendMessageWithAutoChat({
      userId,
      tokenUser: req.user,
      content: value.content,
      replyToMessageId: value.replyToMessageId ?? null,
      courseId: value.course_id,
      subjectId: value.subject_id || null,
      lessonId: value.lesson_id || null,
      enableChatbot: value.enable_chatbot,
    });

    return res.status(201).json({
      message: 'Message sent successfully',
      data: {
        chat_id: result.chatId,
        user_message: result.userMessage,
        bot_message: result.botMessage || null,
        chatbot_response: result.chatbotResponse || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/chats/course/messages
 * Send a human message to course shared chat
 */
export const sendCourseMessage = async (req, res, next) => {
  try {
    const { error, value } = courseMessageSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const userId = req.user.id;

    const result = await sendCourseChatMessage({
      userId,
      tokenUser: req.user,
      content: value.content,
      courseId: value.course_id,
    });

    return res.status(201).json({
      message: 'Course message sent successfully',
      data: {
        chat_id: result.chatId,
        course_id: result.courseId,
        message: result.message,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/chats/course/:course_id
 * Get paginated messages for a course chat
 */
export const getCourseMessages = async (req, res, next) => {
  try {
    const { error, value } = courseMessageQuerySchema.validate(req.query, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const courseId = Number(req.params.course_id);
    const userId = req.user.id;

    if (!courseId || Number.isNaN(courseId)) {
      return next(new AppError('Invalid course id', 400));
    }

    const result = await getCourseChatMessages({
      courseId,
      userId,
      tokenUser: req.user,
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({
      message: 'Course messages retrieved successfully',
      data: {
        chat_id: result.chatId,
        course_id: result.courseId,
        messages: result.messages,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/chats/course/:course_id
 * Get course chat details
 */
export const getCourseChatInfo = async (req, res, next) => {
  try {
    const courseId = Number(req.params.course_id);
    const userId = req.user.id;

    if (!courseId || Number.isNaN(courseId)) {
      return next(new AppError('Invalid course id', 400));
    }

    const chat = await getCourseChatDetails({
      courseId,
      userId,
      tokenUser: req.user,
    });

    return res.status(200).json({
      message: 'Course chat details retrieved successfully',
      data: chat,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/chats/:chatId/messages
 * Get paginated messages from chat
 */
export const getMessages = async (req, res, next) => {
  try {
    const { error, value } = getMessagesSchema.validate(req.query, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const { chatId } = req.params;
    const userId = req.user.id;

    if (!chatId || isNaN(chatId)) {
      return next(new AppError('Invalid chat ID', 400));
    }

    const result = await getChatMessages({
      chatId: Number(chatId),
      userId,
      limit: value.limit,
      offset: value.offset,
    });

    return res.status(200).json({
      message: 'Messages retrieved successfully',
      data: {
        messages: result.messages,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/chats/:chatId/messages/:messageId
 * Soft-delete a message
 */
export const softDeleteMessage = async (req, res, next) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    if (!chatId || isNaN(chatId) || !messageId || isNaN(messageId)) {
      return next(new AppError('Invalid chat or message ID', 400));
    }

    await deleteMessage({
      messageId: Number(messageId),
      userId,
      chatId: Number(chatId),
    });

    return res.status(200).json({
      message: 'Message deleted successfully',
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/chats/message/:id
 * Delete a course chat message by message id
 */
export const deleteCourseMessage = async (req, res, next) => {
  try {
    const messageId = Number(req.params.id);
    const userId = req.user.id;

    if (!messageId || Number.isNaN(messageId)) {
      return next(new AppError('Invalid message id', 400));
    }

    const message = await deleteCourseChatMessage({
      messageId,
      userId,
      tokenUser: req.user,
    });

    return res.status(200).json({
      message: 'Message deleted successfully',
      data: message,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/chats/course/:course_id/clear
 * Clear all course chat messages
 */
export const clearCourseChat = async (req, res, next) => {
  try {
    const courseId = Number(req.params.course_id);
    const userId = req.user.id;

    if (!courseId || Number.isNaN(courseId)) {
      return next(new AppError('Invalid course id', 400));
    }

    const result = await clearCourseChatMessages({
      courseId,
      userId,
      tokenUser: req.user,
    });

    return res.status(200).json({
      message: 'Course chat cleared successfully',
      data: {
        chat_id: result.chatId,
        course_id: result.courseId,
        cleared_messages_count: result.clearedCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/chats/course/seen
 * Mark course message as seen
 */
export const markCourseMessageSeen = async (req, res, next) => {
  try {
    const { error, value } = courseSeenSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await setCourseMessageSeen({
      courseId: value.course_id,
      messageId: value.message_id,
      userId: req.user.id,
      tokenUser: req.user,
    });

    return res.status(200).json({
      message: 'Course message marked as seen',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/chats/course/typing
 * Update course typing indicator
 */
export const courseTyping = async (req, res, next) => {
  try {
    const { error, value } = courseTypingSchema.validate(req.body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const result = await setCourseTyping({
      courseId: value.course_id,
      userId: req.user.id,
      isTyping: value.is_typing,
      tokenUser: req.user,
    });

    return res.status(200).json({
      message: 'Course typing status updated',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/chats/:chatId/clear
 * Clear chat by soft-deleting all messages in the chat
 */
export const clearChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    if (!chatId || isNaN(chatId)) {
      return next(new AppError('Invalid chat ID', 400));
    }

    const result = await clearChatMessages({
      chatId: Number(chatId),
      userId,
    });

    return res.status(200).json({
      message: 'Chat cleared successfully',
      data: {
        chat_id: result.chatId,
        cleared_messages_count: result.clearedCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/chats/:chatId
 * Get chat details
 */
export const getChatDetails = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    if (!chatId || isNaN(chatId)) {
      return next(new AppError('Invalid chat ID', 400));
    }

    const chat = await getChatWithContext(Number(chatId), userId);

    return res.status(200).json({
      message: 'Chat retrieved successfully',
      data: chat,
    });
  } catch (error) {
    return next(error);
  }
};
