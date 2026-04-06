import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { askChatbot } from './chatbotService.js';

const SYSTEM_BOT_EMAIL = 'system-bot@learnova.local';
let CACHED_SYSTEM_BOT_USER_ID = process.env.SYSTEM_BOT_USER_ID
  ? Number(process.env.SYSTEM_BOT_USER_ID)
  : null;

const MAX_MESSAGE_LENGTH = 5000;

const getSystemBotUserId = async () => {
  if (CACHED_SYSTEM_BOT_USER_ID) {
    return CACHED_SYSTEM_BOT_USER_ID;
  }

  const existingBot = await prisma.user.findUnique({
    where: { email: SYSTEM_BOT_EMAIL },
    select: { id: true },
  });

  if (existingBot?.id) {
    CACHED_SYSTEM_BOT_USER_ID = existingBot.id;
    return CACHED_SYSTEM_BOT_USER_ID;
  }

  const createdBot = await prisma.user.create({
    data: {
      name: 'Learnova Bot',
      email: SYSTEM_BOT_EMAIL,
      passwordHashed: 'system_bot_no_login',
      role: 'ADMIN',
    },
    select: { id: true },
  });

  CACHED_SYSTEM_BOT_USER_ID = createdBot.id;
  return CACHED_SYSTEM_BOT_USER_ID;
};

const resolveOrganizationId = async (tokenUser, userId) => {
  const role = String(tokenUser?.role || '').toUpperCase();
  if (role === 'ACADEMY' || role === 'SCHOOL') {
    return Number(tokenUser?.orgId || userId);
  }

  const academyUser = await prisma.academy_user.findUnique({
    where: { user_academy_id: userId },
    select: { OrgId: true },
  });

  if (!academyUser?.OrgId) {
    throw new AppError('Authenticated user is not linked to an organization', 403);
  }

  return academyUser.OrgId;
};

const resolveSubjectIdForCourse = async ({ courseId, subjectId }) => {
  if (subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, Course_id: courseId },
      select: { id: true },
    });

    if (!subject) {
      throw new AppError('subject_id does not belong to course_id', 404);
    }

    return subject.id;
  }

  const firstSubject = await prisma.subject.findFirst({
    where: { Course_id: courseId },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  if (!firstSubject) {
    throw new AppError('No subjects found in this course', 404);
  }

  return firstSubject.id;
};

export const findOrCreateUserCourseChat = async ({
  tokenUser,
  userId,
  courseId,
  subjectId,
  lessonId,
}) => {
  const organizationId = await resolveOrganizationId(tokenUser, userId);
  const resolvedSubjectId = await resolveSubjectIdForCourse({ courseId, subjectId });
  const chatTitle = lessonId
    ? `AI Lesson Chat ${courseId}:${lessonId}:${userId}`
    : `AI Course Chat ${courseId}:${userId}`;

  const existingChat = await prisma.chats.findFirst({
    where: {
      organization_id: organizationId,
      created_by: userId,
      type: 'PRIVATE',
      title: chatTitle,
      subject: {
        is: {
          Course_id: courseId,
        },
      },
      chat_participants: {
        some: {
          user_id: userId,
        },
      },
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  if (existingChat) {
    return existingChat.id;
  }

  const created = await prisma.$transaction(async (tx) => {
    const recheck = await tx.chats.findFirst({
      where: {
        organization_id: organizationId,
        created_by: userId,
        type: 'PRIVATE',
        title: chatTitle,
        subject: {
          is: {
            Course_id: courseId,
          },
        },
        chat_participants: {
          some: {
            user_id: userId,
          },
        },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    if (recheck) {
      return recheck.id;
    }

    const chat = await tx.chats.create({
      data: {
        organization_id: organizationId,
        subject_id: resolvedSubjectId,
        created_by: userId,
        type: 'PRIVATE',
        title: chatTitle,
      },
      select: { id: true },
    });

    await tx.chat_participants.create({
      data: {
        chat_id: chat.id,
        user_id: userId,
      },
    });

    return chat.id;
  });

  return created;
};

/**
 * Verify user is participant in chat
 */
export const verifyUserChatAccess = async (chatId, userId) => {
  const isParticipant = await prisma.chat_participants.findUnique({
    where: {
      chat_id_user_id: { chat_id: chatId, user_id: userId },
    },
  });

  if (!isParticipant) {
    throw new AppError('You do not have access to this chat', 403);
  }

  return true;
};

/**
 * Get chat with full context (organization, course, participants)
 */
export const getChatWithContext = async (chatId, userId) => {
  const chat = await prisma.chats.findFirst({
    where: { id: chatId },
    include: {
      organization: { select: { id: true, Name: true } },
      user: { select: { id: true, email: true } },
      chat_participants: {
        select: {
          user_id: true,
          joined_at: true,
        },
      },
    },
  });

  if (!chat) {
    throw new AppError('Chat not found', 404);
  }

  // Verify authorization
  await verifyUserChatAccess(chatId, userId);

  return chat;
};

/**
 * Save user message to database
 */
export const saveUserMessage = async ({
  chatId,
  senderId,
  content,
  messageType = 'text',
}) => {
  if (!content || !String(content).trim()) {
    throw new AppError('Message content cannot be empty', 400);
  }

  const cleaned = String(content).trim();
  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`, 413);
  }

  const validTypes = ['text', 'image', 'file', 'voice'];
  if (!validTypes.includes(messageType)) {
    throw new AppError('Invalid message type', 400);
  }

  const message = await prisma.messages.create({
    data: {
      chat_id: chatId,
      sender_user_id: senderId,
      message_type: messageType,
      content: cleaned,
      sent_at: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return message;
};

/**
 * Save bot message to database
 */
export const saveBotMessage = async ({
  chatId,
  botContent,
  metadata = {},
}) => {
  const systemBotUserId = await getSystemBotUserId();

  if (!botContent || !String(botContent).trim()) {
    return null;
  }

  const cleaned = String(botContent).trim();

  const message = await prisma.messages.create({
    data: {
      chat_id: chatId,
      sender_user_id: systemBotUserId,
      message_type: 'text',
      content: cleaned,
      sent_at: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return message;
};

/**
 * Determine chatbot context from chat
 * For group chats: course_id is known, extract from DB or request
 * For private chats: use course_id + optional lesson_id from request
 */
export const resolveChatbotContext = async (chat, requestContext = {}) => {
  const { courseId: requestCourseId, subjectId: requestSubjectId, lessonId: requestLessonId } = requestContext;

  // For now: assume courseId must be provided or determinable from chat
  // In a full implementation, you might store course_id on group chats
  if (!requestCourseId) {
    throw new AppError('Could not determine course context for chatbot', 400);
  }

  return {
    courseId: requestCourseId,
    subjectId: requestSubjectId || null,
    lessonId: requestLessonId || null,
  };
};

/**
 * Call chatbot and handle response
 */
export const triggerChatbot = async ({
  question,
  courseId,
  subjectId,
  lessonId,
  tokenUser,
}) => {
  try {
    console.info('[CHATBOT] generating reply');
    const response = await askChatbot({
      tokenUser,
      question,
      courseId,
      subjectId,
      lessonId,
    });

    return response;
  } catch (error) {
    console.error('[CHATBOT] Error triggering chatbot:', error.message);
    return null;
  }
};

/**
 * Send message to chat with optional bot reply
 *
 * Flow:
 * 1. Verify user is participant
 * 2. Save user message
 * 3. Trigger chatbot if context is available
 * 4. Save bot message if response received
 * 5. Return messages
 */
export const sendMessageWithBotReply = async ({
  chatId,
  userId,
  content,
  tokenUser,
  chatbotContext = null, // { courseId, subjectId, lessonId }
  enableChatbot = true,
}) => {
  // 1. Verify access
  const chat = await getChatWithContext(chatId, userId);

  // 2. Save user message
  const userMessage = await saveUserMessage({
    chatId,
    senderId: userId,
    content,
  });

  let botMessage = null;
  let chatbotResponse = null;

  // 3. Trigger chatbot if enabled and context available
  if (enableChatbot && chatbotContext) {
    try {
      chatbotResponse = await triggerChatbot({
        question: content,
        courseId: chatbotContext.courseId,
        subjectId: chatbotContext.subjectId,
        lessonId: chatbotContext.lessonId,
        tokenUser,
      });

      // 4. Save bot message if response received
      if (chatbotResponse && chatbotResponse.answer) {
        botMessage = await saveBotMessage({
          chatId,
          botContent: chatbotResponse.answer,
          metadata: {
            scope: chatbotResponse.scope,
            confidence: chatbotResponse.confidence,
            fallback: chatbotResponse.fallback,
          },
        });
      }
    } catch (error) {
      console.error('[CHATBOT] Failed to get bot reply:', error.message);
      // Graceful: message saved, just no bot reply
    }
  }

  return {
    chatId,
    userMessage,
    botMessage,
    chatbotResponse,
  };
};

export const sendMessageWithAutoChat = async ({
  userId,
  tokenUser,
  content,
  courseId,
  subjectId,
  lessonId,
  enableChatbot = true,
}) => {
  if (!courseId) {
    throw new AppError('course_id is required for automatic chat creation', 400);
  }

  const chatId = await findOrCreateUserCourseChat({
    tokenUser,
    userId,
    courseId,
    subjectId,
    lessonId,
  });

  console.info(`[CHAT] user message saved flow started chat_id=${chatId} user_id=${userId}`);

  const chatbotContext = {
    courseId,
    subjectId: subjectId || null,
    lessonId: lessonId || null,
  };

  const result = await sendMessageWithBotReply({
    chatId,
    userId,
    content,
    tokenUser,
    chatbotContext,
    enableChatbot,
  });

  if (enableChatbot) {
    if (result.botMessage) {
      console.info(`[CHATBOT] reply saved chat_id=${chatId}`);
    } else {
      console.warn(`[CHATBOT ERROR] reply was not saved chat_id=${chatId}`);
    }
  }

  return {
    chatId,
    userMessage: result.userMessage,
    botMessage: result.botMessage,
    chatbotResponse: result.chatbotResponse,
  };
};

/**
 * Get paginated messages from chat
 */
export const getChatMessages = async ({
  chatId,
  userId,
  limit = 20,
  offset = 0,
}) => {
  // Verify access
  await verifyUserChatAccess(chatId, userId);

  // Validate pagination
  const validatedLimit = Math.min(Math.max(1, limit || 20), 100);
  const validatedOffset = Math.max(0, offset || 0);

  const messages = await prisma.messages.findMany({
    where: {
      chat_id: chatId,
      is_deleted: false,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      sent_at: 'desc',
    },
    take: validatedLimit,
    skip: validatedOffset,
  });

  const total = await prisma.messages.count({
    where: {
      chat_id: chatId,
      is_deleted: false,
    },
  });

  return {
    messages: messages.reverse(), // Reverse to get chronological order
    total,
    limit: validatedLimit,
    offset: validatedOffset,
    hasMore: validatedOffset + validatedLimit < total,
  };
};

/**
 * Soft-delete message
 */
export const deleteMessage = async ({
  messageId,
  userId,
  chatId,
}) => {
  const systemBotUserId = await getSystemBotUserId();

  const message = await prisma.messages.findFirst({
    where: {
      id: messageId,
      chat_id: chatId,
    },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Only sender or bot can delete
  if (message.sender_user_id !== userId && message.sender_user_id !== systemBotUserId) {
    throw new AppError('You can only delete your own messages', 403);
  }

  return prisma.messages.update({
    where: { id: messageId },
    data: { is_deleted: true },
  });
};

/**
 * Clear chat by soft-deleting all messages in it
 */
export const clearChatMessages = async ({ chatId, userId }) => {
  const chat = await prisma.chats.findFirst({
    where: { id: chatId },
    select: { id: true },
  });

  if (!chat) {
    throw new AppError('Chat not found', 404);
  }

  await verifyUserChatAccess(chatId, userId);

  const result = await prisma.messages.updateMany({
    where: {
      chat_id: chatId,
      is_deleted: false,
    },
    data: {
      is_deleted: true,
    },
  });

  return {
    chatId,
    clearedCount: result.count,
  };
};

/**
 * Create or get group chat for course
 */
export const getOrCreateGroupChat = async ({
  organizationId,
  courseId,
  userId,
}) => {
  // Check if group chat exists
  let chat = await prisma.chats.findFirst({
    where: {
      organization_id: organizationId,
      type: 'GROUP',
      // Note: GROUP chats should be associated with course
      // This assumes a course_id field; adjust if schema differs
    },
  });

  if (chat) {
    return chat;
  }

  // Create new group chat
  chat = await prisma.chats.create({
    data: {
      organization_id: organizationId,
      created_by: userId,
      type: 'GROUP',
      title: `Course ${courseId} Discussion`,
    },
  });

  return chat;
};

/**
 * Create or get private chat between teacher and student
 */
export const getOrCreatePrivateChat = async ({
  organizationId,
  user1Id,
  user2Id,
  createdByUserId,
}) => {
  // Check if private chat exists
  let chat = await prisma.chats.findFirst({
    where: {
      organization_id: organizationId,
      type: 'PRIVATE',
      // This is tricky without explicit teacher/student IDs
      // For now, assume the system can identify unique pairs
      created_by: createdByUserId,
    },
  });

  if (chat) {
    return chat;
  }

  // Create new private chat
  chat = await prisma.chats.create({
    data: {
      organization_id: organizationId,
      created_by: createdByUserId,
      type: 'PRIVATE',
    },
  });

  // Add participants
  await prisma.chat_participants.createMany({
    data: [
      {
        chat_id: chat.id,
        user_id: user1Id,
      },
      {
        chat_id: chat.id,
        user_id: user2Id,
      },
    ],
  });

  return chat;
};
