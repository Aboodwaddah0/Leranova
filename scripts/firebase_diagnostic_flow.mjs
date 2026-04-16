import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const result = {
  env: { status: 'FAIL', details: [] },
  firebaseInit: { status: 'FAIL', details: [] },
  serviceLayer: { status: 'FAIL', details: [] },
  apiIntegration: { status: 'FAIL', details: [] },
  firebaseWrite: { status: 'FAIL', details: [] },
};

const requiredEnv = [
  'FIREBASE_DATABASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

const now = Date.now();
const firstMessage = `🔥 firebase auto test ${now}`;
const secondMessage = `🔥 second verification message ${now}`;

const printPhase = (title) => {
  console.log(`\n===== ${title} =====`);
};

const mask = (value) => {
  if (!value) return value;
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const parseJson = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const callApi = async ({ method, path, body, token }) => {
  const response = await fetch(`http://localhost:5000${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await parseJson(response);
  return { status: response.status, ok: response.ok, json };
};

const envValidation = () => {
  printPhase('PHASE 1 — ENV VALIDATION');

  for (const key of requiredEnv) {
    const value = process.env[key];
    if (!value || value === 'undefined' || value === 'null') {
      result.env.details.push(`Missing or invalid ${key}`);
      continue;
    }

    if (key === 'FIREBASE_PRIVATE_KEY') {
      const trimmed = value.trim();
      if (!trimmed.startsWith('-----BEGIN PRIVATE KEY-----')) {
        result.env.details.push('FIREBASE_PRIVATE_KEY missing BEGIN marker');
      }
      if (!trimmed.endsWith('-----END PRIVATE KEY-----')) {
        result.env.details.push('FIREBASE_PRIVATE_KEY missing END marker');
      }
      if (!trimmed.includes('\\n') && !trimmed.includes('\n')) {
        result.env.details.push('FIREBASE_PRIVATE_KEY has no newline separators (escaped or real)');
      }
      if (value.startsWith(' ')) {
        result.env.details.push('FIREBASE_PRIVATE_KEY has leading whitespace before opening quote/value');
      }
    }
  }

  console.log('FIREBASE_DATABASE_URL:', process.env.FIREBASE_DATABASE_URL || '(missing)');
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || '(missing)');
  console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL || '(missing)');
  console.log('FIREBASE_PRIVATE_KEY:', mask(process.env.FIREBASE_PRIVATE_KEY || ''));

  if (result.env.details.length === 0) {
    result.env.status = 'OK';
    console.log('ENV OK');
  } else {
    console.log('ENV FAIL:', result.env.details);
  }
};

const staticCodeValidation = async () => {
  printPhase('PHASE 2/3/4 — STATIC CODE VALIDATION');

  const firebaseConfigPath = 'src/config/firebase.js';
  const firebaseServicePath = 'src/services/firebaseService.js';
  const chatServicePath = 'src/services/chatService.js';

  const [firebaseConfig, firebaseService, chatService] = await Promise.all([
    fs.readFile(firebaseConfigPath, 'utf8'),
    fs.readFile(firebaseServicePath, 'utf8'),
    fs.readFile(chatServicePath, 'utf8'),
  ]);

  const configChecks = [
    { ok: firebaseConfig.includes('admin.initializeApp('), message: 'admin.initializeApp exists' },
    { ok: firebaseConfig.includes('credential: admin.credential.cert('), message: 'credential cert config exists' },
    {
      ok:
        firebaseConfig.includes('databaseURL:') ||
        firebaseConfig.includes('databaseURL,'),
      message: 'databaseURL is configured',
    },
    { ok: firebaseConfig.includes('admin.database()'), message: 'admin.database() is used' },
    { ok: !firebaseConfig.includes('admin.firestore('), message: 'admin.firestore() is not used' },
    { ok: firebaseConfig.includes("console.log('🔥 Firebase initialized')"), message: 'Firebase init debug log exists' },
  ];

  for (const check of configChecks) {
    console.log(`Config check: ${check.message} -> ${check.ok ? 'OK' : 'FAIL'}`);
    if (!check.ok) result.firebaseInit.details.push(check.message);
  }
  result.firebaseInit.status = result.firebaseInit.details.length === 0 ? 'OK' : 'FAIL';

  const serviceChecks = [
    {
      ok: firebaseService.includes('export const pushCourseMessage = async (courseId, message) => {'),
      message: 'pushCourseMessage(courseId, message) signature exists',
    },
    {
      ok: firebaseService.includes('const ref = db.ref(`course_chats/${resolvedCourseId}/messages`);'),
      message: 'Realtime DB ref path uses course_chats/{courseId}/messages',
    },
    {
      ok: firebaseService.includes('await ref.push(writeData);'),
      message: 'await ref.push(...) exists',
    },
    {
      ok: firebaseService.includes("console.log('🔥 pushing to firebase', resolvedCourseId);"),
      message: 'push debug log exists',
    },
    {
      ok: firebaseService.includes("console.error('❌ Firebase error:', error);"),
      message: 'error log exists',
    },
  ];

  for (const check of serviceChecks) {
    console.log(`Service check: ${check.message} -> ${check.ok ? 'OK' : 'FAIL'}`);
    if (!check.ok) result.serviceLayer.details.push(check.message);
  }
  result.serviceLayer.status = result.serviceLayer.details.length === 0 ? 'OK' : 'FAIL';

  const apiLinkChecks = [
    {
      ok: chatService.includes('const message = await prisma.messages.create('),
      message: 'course message is inserted into DB',
    },
    {
      ok: chatService.includes('void pushCourseMessage(courseId, message);'),
      message: 'Firebase push is called after DB insert',
    },
  ];

  for (const check of apiLinkChecks) {
    console.log(`Integration check: ${check.message} -> ${check.ok ? 'OK' : 'FAIL'}`);
    if (!check.ok) result.apiIntegration.details.push(check.message);
  }
  result.apiIntegration.status = result.apiIntegration.details.length === 0 ? 'OK' : 'FAIL';
};

const runtimeValidation = async () => {
  printPhase('PHASE 5/6 — RUNTIME TEST + FIREBASE VERIFY');

  const { db } = await import('../src/config/firebase.js');
  const { pushCourseMessage } = await import('../src/services/firebaseService.js');

  if (!db) {
    result.firebaseInit.status = 'FAIL';
    result.firebaseInit.details.push('db instance is null at runtime');
    result.firebaseWrite.details.push('Cannot verify write because Firebase db is null');
    return;
  }

  let token = null;
  try {
    const login = await callApi({
      method: 'POST',
      path: '/api/auth/organization/login',
      body: { Email: 'academy@test.com', password: 'Test@12345' },
    });

    token = login?.json?.data?.token || null;
    if (!token) {
      result.apiIntegration.status = 'FAIL';
      result.apiIntegration.details.push(`Organization login failed or token missing. status=${login.status}`);
      return;
    }

    const apiCall = await callApi({
      method: 'POST',
      path: '/api/chats/course/messages',
      token,
      body: { course_id: 999, content: firstMessage },
    });

    console.log('POST /api/chats/course/messages status:', apiCall.status);
    console.log('POST /api/chats/course/messages body:', JSON.stringify(apiCall.json));

    if (!apiCall.ok) {
      result.apiIntegration.status = 'FAIL';
      result.apiIntegration.details.push(
        `API call failed for course_id=999 with status ${apiCall.status}: ${JSON.stringify(apiCall.json)}`,
      );
    } else {
      result.apiIntegration.status = 'OK';
      result.apiIntegration.details.push('API call succeeded for course_id=999');
    }

    const pathRef = db.ref('course_chats/999/messages');
    const snapshot = await pathRef.get();

    let foundFirst = false;
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const payload = child.val();
        if (payload?.content === firstMessage) {
          foundFirst = true;
          result.firebaseWrite.details.push(`Found first message at key ${child.key}`);
        }
      });
    }

    if (foundFirst) {
      result.firebaseWrite.status = 'OK';
    } else {
      result.firebaseWrite.status = 'FAIL';
      result.firebaseWrite.details.push('Message not found at course_chats/999/messages after API call');

      // Step-by-step debug chain for exact root cause
      result.firebaseWrite.details.push(`ENV status: ${result.env.status}`);
      result.firebaseWrite.details.push(`Firebase init status: ${result.firebaseInit.status}`);
      result.firebaseWrite.details.push(`API integration status: ${result.apiIntegration.status}`);

      // Direct service write to isolate whether issue is API flow or Firebase connectivity
      const directPayload = {
        id: `diag-${now}`,
        chat_id: 999,
        sender_user_id: 1,
        content: `direct-service-write ${now}`,
        sent_at: new Date().toISOString(),
      };

      const directPush = await pushCourseMessage(999, directPayload);
      const afterDirect = await db.ref('course_chats/999/messages').get();

      let foundDirect = false;
      if (afterDirect.exists()) {
        afterDirect.forEach((child) => {
          const payload = child.val();
          if (payload?.content === directPayload.content) {
            foundDirect = true;
            result.firebaseWrite.details.push(`Direct service write succeeded at key ${child.key}`);
          }
        });
      }

      if (directPush && foundDirect) {
        result.firebaseWrite.details.push('Exact failure reason: API flow/authorization prevented Firebase call, but Firebase service connectivity works.');
      } else {
        result.firebaseWrite.details.push('Exact failure reason: Firebase connectivity/write failed even with direct service call.');
      }
    }

    // BONUS: second verification message if all statuses are OK
    const allOk = [result.env.status, result.firebaseInit.status, result.serviceLayer.status, result.apiIntegration.status, result.firebaseWrite.status]
      .every((status) => status === 'OK');

    if (allOk) {
      const secondCall = await callApi({
        method: 'POST',
        path: '/api/chats/course/messages',
        token,
        body: { course_id: 999, content: secondMessage },
      });

      console.log('Second verification status:', secondCall.status);
      const secondSnap = await db.ref('course_chats/999/messages').get();
      let foundSecond = false;
      if (secondSnap.exists()) {
        secondSnap.forEach((child) => {
          const payload = child.val();
          if (payload?.content === secondMessage) {
            foundSecond = true;
          }
        });
      }

      if (secondCall.ok && foundSecond) {
        result.firebaseWrite.details.push('Second verification message confirmed in Firebase.');
      } else {
        result.firebaseWrite.details.push('Second verification message did not appear in Firebase.');
      }
    }
  } catch (error) {
    result.apiIntegration.status = 'FAIL';
    result.firebaseWrite.status = 'FAIL';
    result.apiIntegration.details.push(`Runtime error: ${error.message}`);
    result.firebaseWrite.details.push(`Runtime error: ${error.message}`);
  }
};

const printFinalReport = () => {
  printPhase('PHASE 7 — FINAL REPORT');
  console.log(`✔ ENV: ${result.env.status}`);
  console.log(`✔ Firebase Init: ${result.firebaseInit.status}`);
  console.log(`✔ Service Layer: ${result.serviceLayer.status}`);
  console.log(`✔ API Integration: ${result.apiIntegration.status}`);
  console.log(`✔ Firebase Write: ${result.firebaseWrite.status}`);

  if (result.env.details.length) console.log('ENV details:', result.env.details);
  if (result.firebaseInit.details.length) console.log('Firebase Init details:', result.firebaseInit.details);
  if (result.serviceLayer.details.length) console.log('Service Layer details:', result.serviceLayer.details);
  if (result.apiIntegration.details.length) console.log('API Integration details:', result.apiIntegration.details);
  if (result.firebaseWrite.details.length) console.log('Firebase Write details:', result.firebaseWrite.details);
};

envValidation();
await staticCodeValidation();
await runtimeValidation();
printFinalReport();
