import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const ts = () => new Date().toISOString();

const ORG_ROLES = new Set(['SCHOOL', 'ACADEMY']);

export const updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (typeof fcmToken !== 'string' || !fcmToken.trim()) {
      return next(new AppError('fcmToken is required', 400));
    }

    if (ORG_ROLES.has(req.user?.role)) {
      // Org user — token stored on organization table
      await prisma.organization.update({
        where: { id: req.user.id },
        data:  { fcmToken: fcmToken.trim() },
      });
    } else {
      // Regular user (STUDENT, TEACHER, PARENT, ADMIN)
      await prisma.user.update({
        where: { id: req.user.id },
        data:  { fcmToken: fcmToken.trim() },
      });
    }

    return res.status(200).json({ success: true, status: 200, data: { updated: true }, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};

export const clearFcmToken = async (req, res, next) => {
  try {
    if (ORG_ROLES.has(req.user?.role)) {
      await prisma.organization.update({
        where: { id: req.user.id },
        data:  { fcmToken: null },
      });
    } else {
      await prisma.user.update({
        where: { id: req.user.id },
        data:  { fcmToken: null },
      });
    }
    return res.status(200).json({ success: true, status: 200, data: { cleared: true }, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};
