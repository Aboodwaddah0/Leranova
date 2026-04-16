import dotenv from 'dotenv';

dotenv.config();

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

export const firebaseEnvReady = missingFirebaseEnvVars.length === 0;