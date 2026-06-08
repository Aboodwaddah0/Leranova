import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { sendPushNotification } from './fcmService.js';

const toDto = (n) => ({
  id: n.id,
  content: n.content,
  type: n.Type,
  url: n.Url,
  isSeen: n.isSeen ?? false,
  createdAt: n.createdAt,
});

export const createNotification = async ({ userId, content, type, url = null }) => {
  const [notification, user] = await Promise.all([
    prisma.notification.create({
      data: { User_id: userId, content, Type: type, Url: url },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } }),
  ]);

  if (user?.fcmToken) {
    sendPushNotification({ token: user.fcmToken, type, body: content, url }).catch(() => {});
  }

  return notification;
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

// ── Test / Fake Notification Templates ───────────────────────────────────────

const FAKE_TEMPLATES = {
  // Student scenarios
  STUDENT_LESSON: {
    type: 'LESSON',
    title: '📖 New Lesson Available',
    body: 'Your teacher uploaded "Introduction to Algebra" in Mathematics. Start learning now!',
  },
  STUDENT_MARK: {
    type: 'MARK',
    title: '📊 Mark Received',
    body: 'You scored 87/100 on Chemistry Quiz (Term 1). Great work!',
  },
  STUDENT_ATTENDANCE: {
    type: 'ATTENDANCE',
    title: '✅ Attendance Marked',
    body: 'Your attendance for today (Mathematics) has been recorded as PRESENT.',
  },
  STUDENT_ENROLLMENT: {
    type: 'ENROLLMENT',
    title: '🎓 Enrolled in New Course',
    body: 'You have been enrolled in Grade 10 - Physics. Welcome!',
  },
  STUDENT_MESSAGE: {
    type: 'MESSAGE',
    title: '💬 New Message',
    body: 'Your teacher sent a new message in the Mathematics group chat.',
  },

  // Teacher scenarios
  TEACHER_STUDENT_ENROLLED: {
    type: 'ENROLLMENT',
    title: '👤 New Student Enrolled',
    body: 'Ahmed Al-Rashid joined your Mathematics class (Grade 10).',
  },
  TEACHER_MESSAGE: {
    type: 'MESSAGE',
    title: '💬 New Message in Your Class',
    body: 'A student sent a message in Mathematics - Grade 10 group chat.',
  },
  TEACHER_MARK_REMINDER: {
    type: 'MARK',
    title: '📝 Mark Entry Reminder',
    body: 'Term 1 ends in 3 days. Please complete mark entry for all students in Chemistry.',
  },
  TEACHER_ATTENDANCE_DUE: {
    type: 'ATTENDANCE',
    title: '📋 Attendance Not Entered',
    body: "Today's attendance for Mathematics has not been entered yet. Please mark attendance.",
  },
  TEACHER_AI_READY: {
    type: 'LESSON',
    title: '🤖 AI Content Ready',
    body: 'Flashcards and quiz for "Algebra Basics" are ready. You can publish them to students.',
  },

  // Org scenarios
  ORG_ENROLLMENT: {
    type: 'ENROLLMENT',
    title: '🎓 New Enrollments',
    body: '5 students enrolled in Biology - Grade 11 today. Total: 42 students.',
  },
  ORG_REVENUE: {
    type: 'ENROLLMENT',
    title: '💰 New Revenue',
    body: 'Payment of $150 received for Advanced Mathematics. Monthly total: $2,400.',
  },
  ORG_TEACHER_UPLOAD: {
    type: 'LESSON',
    title: '👨‍🏫 New Lesson Uploaded',
    body: 'Mr. Hassan uploaded "Newton\'s Laws" in Physics - Grade 11.',
  },
  ORG_TERM_CLOSING: {
    type: 'ATTENDANCE',
    title: '📅 Term Closing Soon',
    body: 'Term 1 ends in 7 days. Ensure all teachers have entered marks.',
  },
  ORG_PROMOTION_DONE: {
    type: 'ENROLLMENT',
    title: '✅ Annual Promotion Completed',
    body: '45 students promoted successfully. 3 students retained.',
  },
};

const ORG_ROLES = new Set(['SCHOOL', 'ACADEMY']);

/**
 * Send a fake test notification to the current authenticated user.
 * - For user roles (STUDENT, TEACHER, PARENT): stores in DB + FCM push
 * - For org roles (SCHOOL, ACADEMY): FCM push only (no user record)
 */
export const sendTestNotification = async ({ userId, role, scenario }) => {
  const template = FAKE_TEMPLATES[scenario];
  if (!template) throw new Error(`Unknown test scenario: ${scenario}`);

  if (ORG_ROLES.has(role)) {
    // Org users are NOT in the user table — no DB notification possible.
    // Return a fake injectable notification object so the frontend can add it to local state.
    const org = await prisma.organization.findUnique({
      where: { id: userId },
      select: { fcmToken: true, Name: true },
    });
    let pushSent = false;
    if (org?.fcmToken) {
      await sendPushNotification({ token: org.fcmToken, type: template.type, body: template.body, url: null });
      pushSent = true;
    }

    // Build a fake notification DTO the frontend can inject into its local state
    const fakeNotification = {
      id:        `fake-${Date.now()}`,
      content:   template.body,
      type:      template.type,
      title:     template.title,
      url:       null,
      isSeen:    false,
      createdAt: new Date().toISOString(),
    };

    return {
      scenario,
      type: template.type,
      title: template.title,
      body: template.body,
      pushSent,
      dbStored: false,
      role,
      // ↓ This object is meant to be injected directly into the frontend Redux store
      notification: fakeNotification,
    };
  } else {
    // Regular user (STUDENT, TEACHER, PARENT): create real DB notification + FCM push
    const dbNotif = await createNotification({
      userId,
      content: template.body,
      type: template.type,
      url: null,
    });

    return {
      scenario,
      type: template.type,
      title: template.title,
      body: template.body,
      pushSent: true,
      dbStored: true,
      notificationId: dbNotif?.id,
      role,
      // ↓ Also injectable — matches the DTO from getUserNotifications
      notification: {
        id:        dbNotif?.id,
        content:   template.body,
        type:      template.type,
        title:     template.title,
        url:       null,
        isSeen:    false,
        createdAt: new Date().toISOString(),
      },
    };
  }
};
