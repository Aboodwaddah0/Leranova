import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { askChatbot } from './chatbotService.js';
import { uploadChatAttachment } from './cloudinary.service.js';
import {
  pushCourseMessage,
  markMessageSeen,
  setTyping,
  setOnline,
  setStudentMessageReaction,
  clearStudentMessageReaction,
} from './firebaseService.js';

const SYSTEM_BOT_EMAIL = 'system-bot@learnova.local';
const COURSE_CHAT_TYPE = 'COURSE_GROUP';
let CACHED_SYSTEM_BOT_USER_ID = process.env.SYSTEM_BOT_USER_ID
  ? Number(process.env.SYSTEM_BOT_USER_ID)
  : null;

const MAX_MESSAGE_LENGTH = 5000;
const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '😮'];

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

const serializeStudentChatListItem = (chat) => ({
  id: chat.id,
  type: chat.type === 'CLASS_GROUP' ? 'CLASS' : (chat.subject_id ? 'SUBJECT' : 'COURSE'),
  courseId: chat.course_id ?? null,
  classId: chat.class_id ?? null,
  subjectId: chat.subject_id ?? null,
  createdAt: chat.created_at,
  title: chat.title ?? null,
  lastMessage: chat.lastMessage ?? null,
  lastMessageAt: chat.lastMessageAt ?? chat.created_at,
  unreadCount: Number(chat.unreadCount || 0),
});

const serializeStudentChatMessage = (message, viewerUserId = null) => {
  const groupedReactions = new Map();
  let myReaction = null;

  (message.reactions || []).forEach((item) => {
    if (!item?.reaction) {
      return;
    }

    const emoji = String(item.reaction);
    groupedReactions.set(emoji, (groupedReactions.get(emoji) || 0) + 1);

    if (viewerUserId && Number(item.user_id) === Number(viewerUserId)) {
      myReaction = emoji;
    }
  });

  const reactions = Array.from(groupedReactions.entries())
    .map(([emoji, count]) => ({
      emoji,
      count,
      reactedByMe: myReaction === emoji,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    id: message.id,
    chatId: message.chat_id,
    senderId: message.sender_user_id,
    text: message.content,
    content: message.content,
    isDeleted: Boolean(message.is_deleted),
    editedAt: message.edited_at ?? null,
    isEdited: Boolean(message.edited_at),
    replyToMessageId: message.replyToMessageId ?? null,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          text: message.replyTo.content,
          content: message.replyTo.content,
          senderName: message.replyTo.user?.name || null,
          senderId: message.replyTo.sender_user_id,
          isDeleted: Boolean(message.replyTo.is_deleted),
        }
      : null,
    reactions,
    myReaction,
    createdAt: message.sent_at,
    isSeen: Boolean(message.is_seen),
    seenAt: message.seen_at ?? null,
    sender: message.user
      ? {
          id: message.user.id,
          name: message.user.name ?? null,
          email: message.user.email ?? null,
        }
      : null,
    attachments: (message.message_attachments || []).map((a) => ({
      id: a.id,
      fileName: a.file_name,
      fileUrl: a.file_url,
      fileType: a.file_type || null,
      fileSize: a.file_size ? Number(a.file_size) : null,
    })),
  };
};

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

const resolveReplyToMessageId = async ({ chatId, senderId, replyToMessageId }) => {
  const normalized = Number(replyToMessageId);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null;
  }

  const target = await prisma.messages.findFirst({
    where: {
      id: normalized,
      chat_id: chatId,
      is_deleted: false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!target) {
    throw new AppError('Reply target message not found', 404);
  }

  return target.id;
};

const resolveOrganizationId = async (tokenUser, userId) => {
  const role = String(tokenUser?.role || '').toUpperCase();

  if (role === 'ACADEMY' || role === 'SCHOOL') {
    return Number(tokenUser?.orgId || userId);
  }

  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { Student_id: userId },
      select: { OrgId: true },
    });

    if (student?.OrgId) return student.OrgId;

    // Academy student — not in student table, check academy_user
    const academyStudent = await prisma.academy_user.findUnique({
      where: { user_academy_id: userId },
      select: { OrgId: true },
    });

    if (!academyStudent?.OrgId) {
      throw new AppError('Student is not linked to an organization', 403);
    }

    return academyStudent.OrgId;
  }

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: userId },
      select: { OrgId: true },
    });

    if (!teacher?.OrgId) {
      throw new AppError('Teacher is not linked to an organization', 403);
    }

    return teacher.OrgId;
  }

  // Fallback: check academy_user table
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
    const subject = await prisma.course.findFirst({
      where: { id: subjectId, Course_id: courseId },
      select: { id: true },
    });

    if (!subject) {
      throw new AppError('subject_id does not belong to course_id', 404);
    }

    return subject.id;
  }

  const firstSubject = await prisma.course.findFirst({
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
  const course = await prisma.track.findFirst({
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

    const assignedSubject = await prisma.course.findFirst({
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
      course: {
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
        course: {
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
  replyToMessageId = null,
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

  const resolvedReplyToMessageId = await resolveReplyToMessageId({
    chatId,
    senderId,
    replyToMessageId,
  });

  console.info('[CHAT] saving message', {
    chatId,
    senderId,
    replyToMessageId: resolvedReplyToMessageId,
  });

  const message = await prisma.messages.create({
    data: {
      chat_id: chatId,
      sender_user_id: senderId,
      replyToMessageId: resolvedReplyToMessageId,
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
      replyTo: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  console.info('[CHAT] message saved', {
    messageId: message.id,
    replyToMessageId: message.replyToMessageId ?? null,
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
  replyToMessageId = null,
  tokenUser,
  chatbotContext = null,
  enableChatbot = true,
}) => {
  await getChatWithContext(chatId, userId);

  const userMessage = await saveUserMessage({
    chatId,
    senderId: userId,
    content,
    replyToMessageId,
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
  replyToMessageId = null,
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
    replyToMessageId,
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
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      replyTo: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
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
    messages: messages.reverse().map((message) => ({
      ...message,
      replyTo: message.replyTo
        ? {
            id: message.replyTo.id,
            content: message.replyTo.content,
            senderName: message.replyTo.user?.name || null,
          }
        : null,
    })),
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
      chat_id: chatId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      replyTo: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
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
          track: {
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
  const courseOrgId = message.chats.track?.Org_id ?? message.chats.organization_id;
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

const resolveStudentChatMode = async (userId) => {
  const academyProfile = await prisma.academy_user.findUnique({
    where: { user_academy_id: userId },
    select: {
      user_academy_id: true,
      OrgId: true,
      organization: {
        select: {
          Role: true,
        },
      },
      subject_subscriptions: {
        where: {
          OR: [
            { paymentStatus: 'PAID' },
            { status: 'PAID' },
            { status: 'SUCCESS' },
          ],
        },
        select: {
          Subject_id: true,
          course: {
            select: {
              id: true,
              name: true,
              Course_id: true,
              track: {
                select: {
                  id: true,
                  Name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (academyProfile?.organization?.Role === 'ACADEMY') {
    return {
      mode: 'ACADEMY',
      orgId: academyProfile.OrgId,
      subscriptions: academyProfile.subject_subscriptions || [],
    };
  }

  const schoolProfile = await prisma.student.findUnique({
    where: { Student_id: userId },
    select: {
      Student_id: true,
      OrgId: true,
      Course_id: true,
      GradeLevel: true,
      organization: {
        select: {
          Role: true,
        },
      },
      track: {
        select: {
          id: true,
          Name: true,
        },
      },
    },
  });

  if (schoolProfile?.organization?.Role === 'SCHOOL') {
    return {
      mode: 'SCHOOL',
      orgId: schoolProfile.OrgId,
      classId: schoolProfile.GradeLevel ?? null,
      courseId: schoolProfile.Course_id ?? null,
      className: schoolProfile.GradeLevel !== null && schoolProfile.GradeLevel !== undefined
        ? `Class Chat (Grade ${schoolProfile.GradeLevel})`
        : 'Class Chat',
      courseName: schoolProfile.track?.Name || null,
    };
  }

  throw new AppError('Student profile not linked to an academy or school organization', 403);
};

const ensureClassChatForSchoolStudent = async ({ orgId, classId, createdByUserId, title }) => {
  const existing = await prisma.chats.findFirst({
    where: {
      organization_id: orgId,
      class_id: classId,
      type: 'CLASS_GROUP',
    },
    select: {
      id: true,
      organization_id: true,
      course_id: true,
      class_id: true,
      type: true,
      title: true,
      created_at: true,
    },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.chats.create({
    data: {
      organization_id: orgId,
      class_id: classId,
      created_by: createdByUserId,
      type: 'CLASS_GROUP',
      title: title || null,
    },
    select: {
      id: true,
      organization_id: true,
      course_id: true,
      class_id: true,
      type: true,
      title: true,
      created_at: true,
    },
  });
};

const ensureSubjectChatForAcademyStudent = async ({ orgId, subjectId, createdByUserId, title }) => {
  const existing = await prisma.chats.findFirst({
    where: {
      organization_id: orgId,
      subject_id: subjectId,
      type: 'GROUP',
    },
    select: {
      id: true,
      organization_id: true,
      course_id: true,
      class_id: true,
      subject_id: true,
      type: true,
      title: true,
      created_at: true,
    },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.chats.create({
    data: {
      organization_id: orgId,
      subject_id: subjectId,
      created_by: createdByUserId,
      type: 'GROUP',
      title: title || null,
    },
    select: {
      id: true,
      organization_id: true,
      course_id: true,
      class_id: true,
      subject_id: true,
      type: true,
      title: true,
      created_at: true,
    },
  });
};

const verifyStudentAccessToChat = async ({ chatId, userId }) => {
  const chat = await prisma.chats.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      organization_id: true,
      course_id: true,
      class_id: true,
      subject_id: true,
      type: true,
      title: true,
      created_at: true,
    },
  });

  if (!chat) {
    throw new AppError('Chat not found', 404);
  }

  if (chat.type === 'COURSE_GROUP') {
    throw new AppError('Legacy course chats are disabled for students', 410);
  }

  if (chat.type === 'GROUP' && chat.subject_id) {
    const subscribed = await prisma.student_subject_subscription.findUnique({
      where: {
        user_Academy_id_Subject_id: {
          user_Academy_id: userId,
          Subject_id: chat.subject_id,
        },
      },
      select: {
        paymentStatus: true,
        status: true,
      },
    });

    const paid = subscribed
      ? ['PAID', 'SUCCESS'].includes(String(subscribed.paymentStatus || subscribed.status || '').toUpperCase())
      : false;

    if (!paid) {
      throw new AppError('You are not subscribed to this material chat', 403);
    }

    return chat;
  }

  if (chat.type === 'CLASS_GROUP') {
    const schoolStudent = await prisma.student.findFirst({
      where: {
        Student_id: userId,
        OrgId: chat.organization_id,
        ...(chat.class_id !== null ? { GradeLevel: chat.class_id } : {}),
      },
      select: {
        Student_id: true,
      },
    });

    if (!schoolStudent) {
      throw new AppError('You are not allowed to access this class chat', 403);
    }

    return chat;
  }

  await verifyUserChatAccess(chat.id, userId);
  return chat;
};

export const listChatsForStudent = async ({ userId }) => {
  const context = await resolveStudentChatMode(userId);

  if (context.mode === 'ACADEMY') {
    const subjectIds = context.subscriptions
      .map((row) => row.course?.id)
      .filter((id) => Number.isFinite(Number(id)));

    const chats = subjectIds.length
      ? await prisma.chats.findMany({
          where: {
            organization_id: context.orgId,
            type: 'GROUP',
            subject_id: {
              in: subjectIds,
            },
          },
          select: {
            id: true,
            organization_id: true,
            course_id: true,
            class_id: true,
            subject_id: true,
            type: true,
            title: true,
            created_at: true,
          },
          orderBy: { id: 'asc' },
        })
      : [];

    const chatIds = chats.map((chat) => chat.id);

    const latestMessages = chatIds.length
      ? await prisma.messages.findMany({
          where: {
            chat_id: { in: chatIds },
            is_deleted: false,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            sent_at: 'desc',
          },
          distinct: ['chat_id'],
        })
      : [];

    const unreadCounts = chatIds.length
      ? await prisma.messages.groupBy({
          by: ['chat_id'],
          where: {
            chat_id: { in: chatIds },
            is_deleted: false,
            is_seen: false,
            NOT: {
              sender_user_id: userId,
            },
          },
          _count: {
            _all: true,
          },
        })
      : [];

    const latestMessageByChat = new Map(latestMessages.map((message) => [message.chat_id, message]));
    const unreadByChat = new Map(unreadCounts.map((item) => [item.chat_id, item._count._all]));

    const enriched = chats.map((chat) => {
      const latest = latestMessageByChat.get(chat.id);
      return {
        ...chat,
        lastMessage: latest
          ? {
              id: latest.id,
              content: latest.content,
              senderId: latest.sender_user_id,
              createdAt: latest.sent_at,
              senderName: latest.user?.name || null,
            }
          : null,
        lastMessageAt: latest?.sent_at || chat.created_at,
        unreadCount: unreadByChat.get(chat.id) || 0,
      };
    });

    enriched.sort((a, b) => {
      const aTime = new Date(a.lastMessageAt || a.created_at || 0).getTime();
      const bTime = new Date(b.lastMessageAt || b.created_at || 0).getTime();
      return bTime - aTime;
    });

    return enriched.map(serializeStudentChatListItem);
  }

  const classChat = await prisma.chats.findFirst({
    where: {
      organization_id: context.orgId,
      class_id: context.classId,
      type: 'CLASS_GROUP',
    },
    select: {
      id: true,
      organization_id: true,
      course_id: true,
      class_id: true,
      type: true,
      title: true,
      created_at: true,
    },
    orderBy: { id: 'asc' },
  });

  if (!classChat) {
    return [];
  }

  const latest = await prisma.messages.findFirst({
    where: {
      chat_id: classChat.id,
      is_deleted: false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      sent_at: 'desc',
    },
  });

  const unreadCount = await prisma.messages.count({
    where: {
      chat_id: classChat.id,
      is_deleted: false,
      is_seen: false,
      NOT: {
        sender_user_id: userId,
      },
    },
  });

  return [
    serializeStudentChatListItem({
      ...classChat,
      lastMessage: latest
        ? {
            id: latest.id,
            content: latest.content,
            senderId: latest.sender_user_id,
            createdAt: latest.sent_at,
            senderName: latest.user?.name || null,
          }
        : null,
      lastMessageAt: latest?.sent_at || classChat.created_at,
      unreadCount,
    }),
  ];
};

export const listMessagesForStudentChat = async ({ chatId, userId }) => {
  await verifyStudentAccessToChat({ chatId, userId });

  const seenAt = new Date();
  await prisma.messages.updateMany({
    where: {
      chat_id: chatId,
      is_deleted: false,
      is_seen: false,
      NOT: {
        sender_user_id: userId,
      },
    },
    data: {
      is_seen: true,
      seen_at: seenAt,
    },
  });

  const messages = await prisma.messages.findMany({
    where: { chat_id: chatId },
    include: MSG_INCLUDE,
    orderBy: { sent_at: 'asc' },
  });

  return messages.map((message) => serializeStudentChatMessage(message, userId));
};

const MSG_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  replyTo: { include: { user: { select: { id: true, name: true } } } },
  reactions: { select: { user_id: true, reaction: true } },
  message_attachments: true,
};

const MAX_CHAT_FILES = 5;
const MAX_CHAT_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file

export const sendStudentChatTextMessage = async ({ chatId, userId, content, replyToMessageId = null, files = [] }) => {
  await verifyStudentAccessToChat({ chatId, userId });

  const cleaned = String(content || '').trim();
  if (!cleaned && files.length === 0) {
    throw new AppError('Message content cannot be empty', 400);
  }

  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`, 413);
  }

  if (files.length > MAX_CHAT_FILES) {
    throw new AppError(`You can attach at most ${MAX_CHAT_FILES} files per message`, 400);
  }

  const resolvedReplyToMessageId = await resolveReplyToMessageId({
    chatId,
    senderId: userId,
    replyToMessageId,
  });

  // Upload files to Cloudinary first
  const uploadedFiles = await Promise.all(
    files.map(async (file) => {
      if (file.size > MAX_CHAT_FILE_BYTES) {
        throw new AppError(`File "${file.originalname}" exceeds the 20 MB limit`, 400);
      }
      const { fileUrl } = await uploadChatAttachment(file.buffer, {
        folder: 'learnova/chat',
        resource_type: 'auto',
      });
      return {
        file_name: file.originalname,
        file_url: fileUrl,
        file_type: file.mimetype || null,
        file_size: file.size,
      };
    })
  );

  const messageType = uploadedFiles.length > 0
    ? (uploadedFiles.every((f) => (f.file_type || '').startsWith('image/')) ? 'image' : 'file')
    : 'text';

  const message = await prisma.messages.create({
    data: {
      chat_id: chatId,
      sender_user_id: userId,
      replyToMessageId: resolvedReplyToMessageId,
      message_type: messageType,
      content: cleaned,
      sent_at: new Date(),
      is_seen: false,
      seen_at: null,
      ...(uploadedFiles.length > 0 ? {
        message_attachments: { create: uploadedFiles },
      } : {}),
    },
    include: MSG_INCLUDE,
  });

  return serializeStudentChatMessage(message, userId);
};

export const deleteStudentMessageById = async ({ messageId, userId }) => {
  const message = await prisma.messages.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      chat_id: true,
      sender_user_id: true,
      is_deleted: true,
    },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  await verifyStudentAccessToChat({ chatId: message.chat_id, userId });

  if (Number(message.sender_user_id) !== Number(userId)) {
    throw new AppError('You can only delete your own messages', 403);
  }

  if (message.is_deleted) {
    return { success: true, alreadyDeleted: true };
  }

  await prisma.messages.update({
    where: { id: messageId },
    data: { is_deleted: true },
  });

  return { success: true, alreadyDeleted: false };
};

export const editStudentMessageById = async ({ messageId, userId, content }) => {
  const cleaned = String(content || '').trim();
  if (!cleaned) {
    throw new AppError('Message content cannot be empty', 400);
  }

  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`, 413);
  }

  const message = await prisma.messages.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      chat_id: true,
      sender_user_id: true,
      is_deleted: true,
    },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  await verifyStudentAccessToChat({ chatId: message.chat_id, userId });

  if (Number(message.sender_user_id) !== Number(userId)) {
    throw new AppError('You can only edit your own messages', 403);
  }

  if (message.is_deleted) {
    throw new AppError('Cannot edit a deleted message', 409);
  }

  const updated = await prisma.messages.update({
    where: { id: messageId },
    data: {
      content: cleaned,
      edited_at: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      replyTo: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      reactions: {
        select: {
          user_id: true,
          reaction: true,
        },
      },
    },
  });

  return serializeStudentChatMessage(updated, userId);
};

export const toggleStudentMessageReaction = async ({ messageId, userId, reaction }) => {
  const nextReaction = String(reaction || '').trim();
  if (!ALLOWED_REACTIONS.includes(nextReaction)) {
    throw new AppError('Invalid reaction', 400);
  }

  const message = await prisma.messages.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      chat_id: true,
      is_deleted: true,
    },
  });

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  if (message.is_deleted) {
    throw new AppError('Cannot react to deleted message', 409);
  }

  await verifyStudentAccessToChat({ chatId: message.chat_id, userId });

  const existing = await prisma.message_reaction.findUnique({
    where: {
      message_id_user_id: {
        message_id: messageId,
        user_id: userId,
      },
    },
    select: {
      id: true,
      reaction: true,
    },
  });

  let action = 'added';

  if (existing?.reaction === nextReaction) {
    await prisma.message_reaction.delete({
      where: {
        message_id_user_id: {
          message_id: messageId,
          user_id: userId,
        },
      },
    });
    action = 'removed';

    try {
      await clearStudentMessageReaction({
        chatId: message.chat_id,
        messageId,
        userId,
      });
    } catch (error) {
      console.warn('[CHAT] firebase reaction remove failed', {
        messageId,
        chatId: message.chat_id,
        userId,
        error: error?.message,
      });
    }
  } else {
    await prisma.message_reaction.upsert({
      where: {
        message_id_user_id: {
          message_id: messageId,
          user_id: userId,
        },
      },
      update: {
        reaction: nextReaction,
      },
      create: {
        message_id: messageId,
        user_id: userId,
        reaction: nextReaction,
      },
    });
    action = existing ? 'changed' : 'added';

    try {
      await setStudentMessageReaction({
        chatId: message.chat_id,
        messageId,
        userId,
        reaction: nextReaction,
      });
    } catch (error) {
      console.warn('[CHAT] firebase reaction set failed', {
        messageId,
        chatId: message.chat_id,
        userId,
        reaction: nextReaction,
        error: error?.message,
      });
    }
  }

  const updatedMessage = await prisma.messages.findUnique({
    where: { id: messageId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      replyTo: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      reactions: {
        select: {
          user_id: true,
          reaction: true,
        },
      },
    },
  });

  return {
    action,
    message: serializeStudentChatMessage(updatedMessage, userId),
  };
};

export const markStudentChatMessagesSeen = async ({ chatId, userId }) => {
  await verifyStudentAccessToChat({ chatId, userId });

  const seenAt = new Date();

  await prisma.messages.updateMany({
    where: {
      chat_id: chatId,
      is_deleted: false,
      is_seen: false,
      NOT: {
        sender_user_id: userId,
      },
    },
    data: {
      is_seen: true,
      seen_at: seenAt,
    },
  });

  return { chatId, seenAt };
};

export const resolveStudentChatRoom = async ({ chatId, userId }) => {
  const chat = await verifyStudentAccessToChat({ chatId, userId });

  if (chat.type === 'CLASS_GROUP') {
    return {
      room: `class_${chat.class_id}`,
      chat,
    };
  }

  return {
    room: `course_${chat.course_id}`,
    chat,
  };
};
