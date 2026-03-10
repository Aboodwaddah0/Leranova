import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const getUserNotifications = async (userId) => {
  return prisma.notification.findMany({
    where: { User_id: Number(userId) },
    orderBy: { id: 'desc' },
  });
};

const markAsSeen = async (id, userId) => {
  const notif = await prisma.notification.findUnique({ where: { id: Number(id) } });
  if (!notif) throw new AppError('Notification not found', 404);
  if (notif.User_id !== Number(userId)) throw new AppError('Not authorized', 403);
  return prisma.notification.update({ where: { id: Number(id) }, data: { isSeen: true } });
};

const createNotification = async (data) => {
  return prisma.notification.create({ data });
};

export { getUserNotifications, markAsSeen, createNotification };
