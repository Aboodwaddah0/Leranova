import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const toDto = (n) => ({
  id: n.id,
  content: n.content,
  type: n.Type,
  url: n.Url,
  isSeen: n.isSeen,
  createdAt: n.createdAt,
});

export const createNotification = async ({ userId, content, type, url = null }) => {
  return prisma.notification.create({
    data: { User_id: userId, content, Type: type, Url: url },
  });
};

export const getUserNotifications = async (userId, { skip = 0, limit = 20 } = {}) => {
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { User_id: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { User_id: userId } }),
    prisma.notification.count({ where: { User_id: userId, isSeen: false } }),
  ]);

  return { notifications: notifications.map(toDto), total, unreadCount, skip, limit };
};

export const getUnreadCount = async (userId) => {
  return prisma.notification.count({ where: { User_id: userId, isSeen: false } });
};

export const markAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, User_id: userId },
  });

  if (!notification) throw new AppError('Notification not found', 404);

  return toDto(
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isSeen: true },
    }),
  );
};

export const markAllAsRead = async (userId) => {
  const { count } = await prisma.notification.updateMany({
    where: { User_id: userId, isSeen: false },
    data: { isSeen: true },
  });
  return { updated: count };
};
