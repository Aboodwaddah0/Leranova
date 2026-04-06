import Joi from 'joi';
import AppError from '../utils/appError.js';
import {
  getChatWithContext,
  sendMessageWithBotReply,
  sendMessageWithAutoChat,
  getChatMessages,
  deleteMessage,
  clearChatMessages,
} from '../services/chatService.js';

// Validation schemas
const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
  message_type: Joi.string().valid('text', 'image', 'file', 'voice').default('text'),
  course_id: Joi.number().integer().positive().optional(),  // For chatbot context
  subject_id: Joi.number().integer().positive().optional(),
  lesson_id: Joi.number().integer().positive().optional(),
  enable_chatbot: Joi.boolean().default(true),  // Control bot reply
});

const getMessagesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

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
 * Send a message without providing chat_id (auto-find/create by user + course)
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
