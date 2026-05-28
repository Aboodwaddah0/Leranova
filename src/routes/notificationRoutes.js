import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { checkFeature } from '../middlewares/checkFeature.js';
import * as ctrl from '../controllers/notificationController.js';

const router = express.Router();

const notifFeature = (req, res, next) =>
  req.user?.role === 'ADMIN' ? next() : checkFeature('NOTIFICATIONS')(req, res, next);

router.get('/',                  authMiddleware, notifFeature, ctrl.getNotifications);
router.get('/unread-count',      authMiddleware, notifFeature, ctrl.getUnreadCount);
router.post('/:id/mark-as-read', authMiddleware, notifFeature, ctrl.markAsRead);
router.post('/mark-all-read',    authMiddleware, notifFeature, ctrl.markAllAsRead);

export default router;
