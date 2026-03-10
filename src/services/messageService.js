import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getChatMessages = async (chatId) => {
  return prisma.messages.findMany({
    where: { chat_id: Number(chatId), is_deleted: false },
    include: {
      user: { select: { id: true, Name: true } },
      message_attachments: true,
    },
    orderBy: { sent_at: 'asc' },
  });
};

const sendMessage = async (userId, { chat_id, content, message_type }) => {
  return prisma.messages.create({
    data: { chat_id, content, message_type, sender_user_id: Number(userId) },
    include: { user: { select: { id: true, Name: true } } },
  });
};

const deleteMessage = async (id, userId) => {
  const message = await prisma.messages.findUnique({ where: { id: Number(id) } });
  if (!message) throw new AppError('Message not found', 404);
  if (message.sender_user_id !== Number(userId)) throw new AppError('Not authorized', 403);
  return prisma.messages.update({ where: { id: Number(id) }, data: { is_deleted: true } });
};

export { getChatMessages, sendMessage, deleteMessage };
