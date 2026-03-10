import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getUserChats = async (userId) => {
  return prisma.chats.findMany({
    where: { chat_participants: { some: { user_id: Number(userId) } } },
    include: { chat_participants: { include: { user: { select: { id: true, Name: true } } } } },
  });
};

const getChatById = async (id) => {
  const chat = await prisma.chats.findUnique({
    where: { id: Number(id) },
    include: {
      chat_participants: { include: { user: { select: { id: true, Name: true } } } },
      messages: { orderBy: { sent_at: 'asc' }, take: 50 },
    },
  });
  if (!chat) throw new AppError('Chat not found', 404);
  return chat;
};

const createChat = async (userId, { organization_id, subject_id, type, title, participants }) => {
  return prisma.chats.create({
    data: {
      organization_id,
      subject_id,
      type,
      title,
      created_by: Number(userId),
      chat_participants: {
        create: [...new Set([...participants, Number(userId)])].map((uid) => ({ user_id: uid })),
      },
    },
    include: { chat_participants: true },
  });
};

export { getUserChats, getChatById, createChat };
