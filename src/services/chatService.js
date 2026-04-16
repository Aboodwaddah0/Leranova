import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { askChatbot } from './chatbotService.js';
import {
  pushCourseMessage,
  markMessageSeen,
  setTyping,
  setOnline,
} from './firebaseService.js';

const SYSTEM_BOT_EMAIL = 'system-bot@learnova.local';
const COURSE_CHAT_TYPE = 'COURSE_GROUP';
let CACHED_SYSTEM_BOT_USER_ID = process.env.SYSTEM_BOT_USER_ID
  ? Number(process.env.SYSTEM_BOT_USER_ID)
  : null;

const MAX_MESSAGE_LENGTH = 5000;

const serializeCourseChat = (chat) => {
  if (!chat) {
    return null;
  }

  return {
    id: chat.id,
    organization_id: chat.organization_id,
    course_id: chat.course_id,
    subject_id: chat.subject_id ?? null,
    created_by: chat.created_by,
    type: String(chat.type || '').toLowerCase(),
    title: chat.title ?? null,
    created_at: chat.created_at,
  };
};

const serializeCourseMessage = (message) => ({
  id: message.id,
  chat_id: message.chat_id,
  course_id: message.chats?.course_id ?? null,
  sender_user_id: message.sender_user_id,
  message_type: message.message_type ?? 'text',
  content: message.content,
  created_at: message.sent_at,
  sent_at: message.sent_at,
  edited_at: message.edited_at ?? null,
  is_deleted: Boolean(message.is_deleted),
  sender: message.user
    ? {
        id: message.user.id,
        email: message.user.email,
        name: message.user.name ?? null,
      }
    : null,
});

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

const getCourseById = async (courseId) => {
  const course = await prisma.course.findFirst({
    where: { id: courseId },
    select: {
      id: true,
      Org_id: true,
      Name: true,
    },
  });

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  return course;
};

const resolveCourseEnrollment = async ({ courseId, userId, tokenUser }) => {
  const course = await getCourseById(courseId);
  const role = String(tokenUser?.role || '').trim().toUpperCase();

  if (role === 'STUDENT') {
    const schoolStudent = await prisma.student.findFirst({
      where: {
        Student_id: userId,
        OrgId: course.Org_id,
        Course_id: courseId,
      },
      select: { Student_id: true },
    });

    if (schoolStudent) {
      return course;
    }

    const academyUser = await prisma.academy_user.findFirst({
      where: {
        user_academy_id: userId,
        OrgId: course.Org_id,
      },
      select: { user_academy_id: true },
    });

    if (academyUser) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          user_Academy_id_Course_id: {
            user_Academy_id: userId,
            Course_id: courseId,
          },
        },
        select: { user_Academy_id: true },
      });

      if (enrollment) {
        return course;
      }
    }
  }

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findFirst({
      where: {
        Teacher_id: userId,
        OrgId: course.Org_id,
      },
      select: {
        Teacher_id: true,
      },
    });

    if (!teacher) {
      throw new AppError('You are not assigned to this course', 403);
    }

    const assignedSubject = await prisma.subject.findFirst({
      where: {
        Course_id: courseId,
        Teacher_id: userId,
      },
      select: {
        id: true,
      },
    });

    if (assignedSubject) {
      return course;
    }
  }

  throw new AppError('You are not enrolled in this course', 403);
};

export const ensureCourseChatForCourse = async ({
  organizationId,
  courseId,
  title,
  createdByUserId,
  tx = prisma,
}) => {
  const courseChatCreatorId = createdByUserId || (await getSystemBotUserId());

  const existingChat = await tx.chats.findUnique({
    where: { course_id: courseId },
    select: {
      id: true,
      organization_id: true,
      course_id: true,
      subject_id: true,
      created_by: true,
      type: true,
      title: true,
      created_at: true,
    },
  });

  if (existingChat) {
    return existingChat;
  }

  return tx.chats.create({
    data: {
      organization_id: organizationId,
      course_id: courseId,
      created_by: courseChatCreatorId,
      type: COURSE_CHAT_TYPE,
      title: title || null,
    },
    select: {
      id: true,
      organization_id: true,
      course_id: true,
      subject_id: true,
      created_by: true,
      type: true,
      title: true,
      created_at: true,
    },
  });
};

export const getCourseChatByCourseId = async ({ courseId, userId, tokenUser }) => {
  await resolveCourseEnrollment({ courseId, userId, tokenUser });

  const chat = await prisma.chats.findUnique({
    where: { course_id: courseId },
    select: {
      id: true,
      organization_id: true,
      course_id: true,
      subject_id: true,
      created_by: true,
      type: true,
      title: true,
      created_at: true,
    },
  });

  if (!chat || chat.type !== COURSE_CHAT_TYPE) {
    throw new AppError('Course chat not found', 404);
  }

  return serializeCourseChat(chat);
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

  await verifyUserChatAccess(chatId, userId);

  return chat;
};

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
          name: true,
        },
      },
    },
  });

  return message;
};

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
          name: true,
        },
      },
    },
  });

  return message;
};

export const resolveChatbotContext = async (chat, requestContext = {}) => {
  const { courseId: requestCourseId, subjectId: requestSubjectId, lessonId: requestLessonId } = requestContext;

  if (!requestCourseId) {
    throw new AppError('Could not determine course context for chatbot', 400);
  }

  return {
    courseId: requestCourseId,
    subjectId: requestSubjectId || null,
    lessonId: requestLessonId || null,
  };
};

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

export const sendMessageWithBotReply = async ({
  chatId,
  userId,
  content,
  tokenUser,
  chatbotContext = null,
  enableChatbot = true,
}) => {
  await getChatWithContext(chatId, userId);

  const userMessage = await saveUserMessage({
    chatId,
    senderId: userId,
    content,
  });

  let botMessage = null;
  let chatbotResponse = null;

  if (enableChatbot && chatbotContext) {
    try {
      chatbotResponse = await triggerChatbot({
        question: content,
        courseId: chatbotContext.courseId,
        subjectId: chatbotContext.subjectId,
        lessonId: chatbotContext.lessonId,
        tokenUser,
      });

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

  return {
    chatId,
    userMessage: result.userMessage,
    botMessage: result.botMessage,
    chatbotResponse: result.chatbotResponse,
  };
};

export const sendCourseChatMessage = async ({
  userId,
  tokenUser,
  content,
  courseId,
}) => {
  if (!courseId) {
    throw new AppError('course_id is required for course chat messages', 400);
  }

  const chat = await getCourseChatByCourseId({
    courseId,
    userId,
    tokenUser,
  });

  const cleanedContent = String(content || '').trim();
  if (!cleanedContent) {
    throw new AppError('Message content cannot be empty', 400);
  }

  const message = await prisma.messages.create({
    data: {
      chat_id: chat.id,
      sender_user_id: userId,
      message_type: 'text',
      content: cleanedContent,
      sent_at: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      chats: {
        select: {
          course_id: true,
          organization_id: true,
          type: true,
        },
      },
    },
  });

  console.log('📡 Calling Firebase push...', {
    courseId,
    messageId: message.id,
  });

  console.log('📦 Course chat ensured:', courseId);

  await pushCourseMessage(courseId, message);

  await setOnline(courseId, userId);

  return {
    chatId: chat.id,
    courseId,
    message: serializeCourseMessage(message),
  };
};

export const setCourseMessageSeen = async ({ courseId, messageId, userId, tokenUser }) => {
  const chat = await getCourseChatByCourseId({
    courseId,
    userId,
    tokenUser,
  });

  if (!chat) {
    throw new AppError('Course chat not found', 404);
  }

  await markMessageSeen(courseId, messageId, userId);

  return {
    courseId,
    messageId,
    userId,
    seen: true,
  };
};

export const setCourseTyping = async ({ courseId, userId, isTyping, tokenUser }) => {
  const chat = await getCourseChatByCourseId({
    courseId,
    userId,
    tokenUser,
  });

  if (!chat) {
    throw new AppError('Course chat not found', 404);
  }

  await setTyping(courseId, userId, Boolean(isTyping));

  return {
    courseId,
    userId,
    is_typing: Boolean(isTyping),
  };
};

export const getChatMessages = async ({
  chatId,
  userId,
  limit = 20,
  offset = 0,
}) => {
  await verifyUserChatAccess(chatId, userId);

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
          name: true,
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
    messages: messages.reverse(),
    total,
    limit: validatedLimit,
    offset: validatedOffset,
    hasMore: validatedOffset + validatedLimit < total,
  };
};

export const getCourseChatMessages = async ({
  courseId,
  userId,
  tokenUser,
  limit = 20,
  offset = 0,
}) => {
  const chat = await getCourseChatByCourseId({
    courseId,
    userId,
    tokenUser,
  });

  const validatedLimit = Math.min(Math.max(1, limit || 20), 100);
  const validatedOffset = Math.max(0, offset || 0);

  const messages = await prisma.messages.findMany({
    where: {
      chat_id: chat.id,
      is_deleted: false,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      chats: {
        select: {
          course_id: true,
          organization_id: true,
          type: true,
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
      chat_id: chat.id,
      is_deleted: false,
    },
  });

  return {
    chatId: chat.id,
    courseId,
    messages: messages.reverse().map(serializeCourseMessage),
    total,
    limit: validatedLimit,
    offset: validatedOffset,
    hasMore: validatedOffset + validatedLimit < total,
  };
};

export const getCourseChatDetails = async ({ courseId, userId, tokenUser }) => {
  return getCourseChatByCourseId({ courseId, userId, tokenUser });
};

export const deleteCourseChatMessage = async ({ messageId, userId, tokenUser }) => {
  const message = await prisma.messages.findFirst({
    where: { id: messageId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      chats: {
        include: {
          course: {
            select: {
              id: true,
              Org_id: true,
              Name: true,
            },
          },
        },
      },
    },
  });

  if (!message || !message.chats || message.chats.type !== COURSE_CHAT_TYPE || !message.chats.course_id) {
    throw new AppError('Message not found', 404);
  }

  const role = String(tokenUser?.role || '').trim().toUpperCase();
  const courseOrgId = message.chats.course?.Org_id ?? message.chats.organization_id;
  const isOwner = message.sender_user_id === userId;

  let canDelete = isOwner;

  if (!canDelete && role === 'TEACHER') {
    const teacher = await prisma.teacher.findFirst({
      where: {
        Teacher_id: userId,
        OrgId: courseOrgId,
      },
      select: {
        Teacher_id: true,
      },
    });

    canDelete = Boolean(teacher);
  }

  if (!canDelete && role === 'ADMIN') {
    const adminOrgId = await resolveOrganizationId(tokenUser, userId);
    canDelete = adminOrgId === courseOrgId;
  }

  if (!canDelete) {
    throw new AppError('You cannot delete this message', 403);
  }

  const updatedMessage = await prisma.messages.update({
    where: { id: messageId },
    data: { is_deleted: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      chats: {
        select: {
          course_id: true,
          organization_id: true,
          type: true,
        },
      },
    },
  });

  return serializeCourseMessage(updatedMessage);
};

export const clearCourseChatMessages = async ({ courseId, userId, tokenUser }) => {
  const chat = await getCourseChatByCourseId({
    courseId,
    userId,
    tokenUser,
  });

  const role = String(tokenUser?.role || '').trim().toUpperCase();
  if (!['TEACHER', 'ADMIN'].includes(role)) {
    throw new AppError('Only teacher or admin can clear course chat', 403);
  }

  if (role === 'ADMIN') {
    const adminOrgId = await resolveOrganizationId(tokenUser, userId);
    if (adminOrgId !== chat.organization_id) {
      throw new AppError('Cross-organization access denied', 403);
    }
  }

  const result = await prisma.messages.updateMany({
    where: {
      chat_id: chat.id,
      is_deleted: false,
    },
    data: {
      is_deleted: true,
    },
  });

  return {
    chatId: chat.id,
    courseId,
    clearedCount: result.count,
  };
};

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

  if (message.sender_user_id !== userId && message.sender_user_id !== systemBotUserId) {
    throw new AppError('You can only delete your own messages', 403);
  }

  return prisma.messages.update({
    where: { id: messageId },
    data: { is_deleted: true },
  });
};

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
