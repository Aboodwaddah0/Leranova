import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const initFirebase = () => {
  if (getApps().length > 0) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY — push notifications disabled.');
    return;
  }

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
};

export const getFirebaseMessaging = () => {
  initFirebase();
  if (getApps().length === 0) return null;
  return getMessaging();
};
