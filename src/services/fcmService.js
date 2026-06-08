import { getFirebaseMessaging } from '../utils/firebase.js';

const TYPE_TITLES = {
  ENROLLMENT:  'New Enrollment',
  MARK:        'Mark Recorded',
  ATTENDANCE:  'Attendance Update',
  LESSON:      'New Lesson',
  MESSAGE:     'New Message',
};

const typeToTitle = (type) => TYPE_TITLES[type] ?? 'Learnova';

export const sendPushNotification = async ({ token, type, body, url }) => {
  if (!token) return;

  const messaging = getFirebaseMessaging();
  if (!messaging) return;

  try {
    await messaging.send({
      token,
      notification: { title: typeToTitle(type), body },
      data: url ? { url } : {},
      webpush: {
        notification: {
          icon:  '/icon-192.png',
          badge: '/badge-72.png',
        },
        fcmOptions: url ? { link: url } : {},
      },
    });
  } catch (err) {
    // Invalid / expired token — log only, never crash the main flow
    console.error('[FCM] Push failed:', err.message);
  }
};
