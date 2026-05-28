import * as notificationService from '../services/notificationService.js';
import AppError from '../utils/appError.js';

const ts = () => new Date().toISOString();

export const getNotifications = async (req, res, next) => {
  try {
    const skip = Math.max(0, Number(req.query.skip) || 0);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const data = await notificationService.getUserNotifications(req.user.id, { skip, limit });
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return res.status(200).json({ success: true, status: 200, data: { unreadCount: count }, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return next(new AppError('Invalid notification id', 400));
    const notification = await notificationService.markAsRead(id, req.user.id);
    return res.status(200).json({ success: true, status: 200, data: { notification }, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    return res.status(200).json({ success: true, status: 200, data: result, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};
