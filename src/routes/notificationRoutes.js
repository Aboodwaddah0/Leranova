import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { checkFeature } from '../middlewares/checkFeature.js';
import * as ctrl from '../controllers/notificationController.js';

const router = express.Router();

const BYPASS_ROLES = new Set(['ADMIN', 'SCHOOL', 'ACADEMY', 'TEACHER', 'STUDENT', 'PARENT']);
const notifFeature = (req, res, next) =>
  BYPASS_ROLES.has(req.user?.role) ? next() : checkFeature('NOTIFICATIONS')(req, res, next);

router.get('/',                  authMiddleware, notifFeature, ctrl.getNotifications);
router.get('/unread-count',      authMiddleware, notifFeature, ctrl.getUnreadCount);
router.post('/:id/mark-as-read', authMiddleware, notifFeature, ctrl.markAsRead);
router.post('/mark-all-read',    authMiddleware, notifFeature, ctrl.markAllAsRead);

export default router;
