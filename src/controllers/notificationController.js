import * as notificationService from '../services/notificationService.js';
import AppError from '../utils/appError.js';

const ORG_ROLES = new Set(['SCHOOL', 'ACADEMY']);

const ROLE_DEFAULT_SCENARIOS = {
  STUDENT: ['STUDENT_LESSON', 'STUDENT_MARK', 'STUDENT_ATTENDANCE', 'STUDENT_ENROLLMENT', 'STUDENT_MESSAGE'],
  TEACHER: ['TEACHER_STUDENT_ENROLLED', 'TEACHER_MESSAGE', 'TEACHER_MARK_REMINDER', 'TEACHER_ATTENDANCE_DUE', 'TEACHER_AI_READY'],
  SCHOOL:  ['ORG_ENROLLMENT', 'ORG_REVENUE', 'ORG_TEACHER_UPLOAD', 'ORG_TERM_CLOSING', 'ORG_PROMOTION_DONE'],
  ACADEMY: ['ORG_ENROLLMENT', 'ORG_REVENUE', 'ORG_TEACHER_UPLOAD'],
  PARENT:  ['STUDENT_MARK', 'STUDENT_ATTENDANCE'],
};

const ts = () => new Date().toISOString();

export const getNotifications = async (req, res, next) => {
  try {
    const skip  = Math.max(0, Number(req.query.skip)  || 0);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    // Org users are not in the user table — return empty list instead of crashing
    if (ORG_ROLES.has(req.user?.role)) {
      return res.status(200).json({
        success: true, status: 200,
        data: { notifications: [], total: 0, unreadCount: 0, skip, limit },
        error: null, timestamp: ts(),
      });
    }

    const data = await notificationService.getUserNotifications(req.user.id, { skip, limit });
    return res.status(200).json({ success: true, status: 200, data, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    // Org users have no user record — unread count is always 0 from DB
    if (ORG_ROLES.has(req.user?.role)) {
      return res.status(200).json({ success: true, status: 200, data: { unreadCount: 0 }, error: null, timestamp: ts() });
    }

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

    // Org users: just acknowledge (no DB record)
    if (ORG_ROLES.has(req.user?.role)) {
      return res.status(200).json({ success: true, status: 200, data: { notification: { id } }, error: null, timestamp: ts() });
    }

    const notification = await notificationService.markAsRead(id, req.user.id);
    return res.status(200).json({ success: true, status: 200, data: { notification }, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    if (ORG_ROLES.has(req.user?.role)) {
      return res.status(200).json({ success: true, status: 200, data: { updated: 0 }, error: null, timestamp: ts() });
    }
    const result = await notificationService.markAllAsRead(req.user.id);
    return res.status(200).json({ success: true, status: 200, data: result, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications/test
 * Body: { scenario?: string }
 *
 * Returns the notification object so the client can inject it into local state.
 * For USER roles (STUDENT, TEACHER, PARENT): also creates a real DB notification.
 * For ORG roles (SCHOOL, ACADEMY): returns fake object only — client injects locally.
 */
export const testNotification = async (req, res, next) => {
  try {
    const role = req.user?.role;
    const validScenarios = ROLE_DEFAULT_SCENARIOS[role] ?? [];

    let { scenario } = req.body ?? {};
    if (!scenario || !validScenarios.includes(scenario)) {
      scenario = validScenarios[0];
    }
    if (!scenario) {
      return next(new AppError(`No test scenarios for role: ${role}`, 400));
    }

    const result = await notificationService.sendTestNotification({ userId: req.user.id, role, scenario });

    return res.status(200).json({ success: true, status: 200, data: result, error: null, timestamp: ts() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications/test-all
 * Fires ALL test scenarios for the current role.
 */
export const testAllNotifications = async (req, res, next) => {
  try {
    const role = req.user?.role;
    const scenarios = ROLE_DEFAULT_SCENARIOS[role] ?? [];
    if (!scenarios.length) return next(new AppError(`No test scenarios for role: ${role}`, 400));

    const results = [];
    for (const scenario of scenarios) {
      try {
        const r = await notificationService.sendTestNotification({ userId: req.user.id, role, scenario });
        results.push({ scenario, success: true, ...r });
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (e) {
        results.push({ scenario, success: false, error: e.message });
      }
    }

    return res.status(200).json({
      success: true, status: 200,
      data: { sent: results.filter(r => r.success).length, total: scenarios.length, results },
      error: null, timestamp: ts(),
    });
  } catch (err) {
    next(err);
  }
};
