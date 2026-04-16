import './env.js';
import admin from 'firebase-admin';

const requiredFirebaseEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_DATABASE_URL',
];

const missingFirebaseEnvVars = requiredFirebaseEnvVars.filter((variableName) => {
  return !process.env[variableName];
});

if (missingFirebaseEnvVars.length > 0) {
  console.error('[FIREBASE ERROR] Missing required environment variables:', missingFirebaseEnvVars.join(', '));
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;

const databaseURL = process.env.FIREBASE_DATABASE_URL
  ? process.env.FIREBASE_DATABASE_URL.trim()
  : null;

if (!admin.apps.length && missingFirebaseEnvVars.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    databaseURL,
  });

  console.log('🔥 Firebase initialized');
}

// Initialize Realtime Database (instead of Firestore)
const db = admin.apps.length ? admin.database() : null;

export { admin, db };