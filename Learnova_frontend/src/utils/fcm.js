import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';
import api from './api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const registerFcmToken = async () => {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging || !VAPID_KEY) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    });

    if (token) {
      await api.patch('/me/fcm-token', { fcmToken: token });
    }
  } catch (err) {
    // Non-fatal — push notifications optional
    console.warn('[FCM] Token registration failed:', err.message);
  }
};

export const clearFcmToken = async () => {
  try {
    await api.delete('/me/fcm-token');
  } catch {
    // ignore
  }
};

// Listen for foreground notifications and show browser notification
export const listenForegroundMessages = async (onNotification) => {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const { title, body } = payload.notification ?? {};
    const url = payload.data?.url;

    // Show browser notification even when app is in foreground
    if (Notification.permission === 'granted' && title) {
      const notif = new Notification(title, { body, icon: '/icon-192.png' });
      if (url) notif.onclick = () => { window.focus(); window.location.href = url; };
    }

    if (onNotification) onNotification(payload);
  });
};
