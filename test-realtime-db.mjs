import 'dotenv/config';
process.env.DATABASE_URL = 'mysql://root:root@127.0.0.1:3306/learnova';

const { default: prisma } = await import('./src/utils/prisma.js');
const { db } = await import('./src/config/firebase.js');

const baseUrl = 'http://localhost:5000';
const suffix = Date.now();
const messageContent = `firebase realtimedb proof ${suffix}`;

const extractValue = (json, keys) => {
  for (const keyPath of keys) {
    let current = json;
    let found = true;
    for (const key of keyPath) {
      if (current && Object.prototype.hasOwnProperty.call(current, key)) {
        current = current[key];
      } else {
        found = false;
        break;
      }
    }
    if (found && current !== undefined && current !== null) {
      return current;
    }
  }
  return null;
};

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Non-JSON response for ${path}: ${text}`);
  }
  if (!response.ok) throw new Error(`${path} failed (${response.status}): ${text}`);
  return { status: response.status, json };
}

const result = {
  mysqlVerified: false,
  realtimeDbVerified: false,
  dbInstance: db ? 'initialized' : 'not initialized',
};

try {
  const orgLogin = await requestJson('/api/auth/organization/login', {
    method: 'POST',
    body: JSON.stringify({ Email: 'academy@test.com', password: 'Test@12345' }),
  });

  const orgToken = extractValue(orgLogin.json, [
    ['data', 'token'],
    ['data', 'data', 'token'],
    ['token'],
  ]);
  if (!orgToken) throw new Error('Organization token missing');

  const suffix2 = Date.now();
  const teacherEmail = `firebase.teacher.${suffix2}@test.com`;
  const teacherPassword = 'Password123!';

  const teacherCreate = await requestJson('/api/teachers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${orgToken}` },
    body: JSON.stringify({
      name: `Firebase Teacher ${suffix2}`,
      email: teacherEmail,
      password: teacherPassword,
      work: 'Science',
      specialization: 'Physics',
      bio: 'Firebase validation teacher',
    }),
  });

  const teacherId = extractValue(teacherCreate.json, [
    ['data', 'id'],
    ['data', 'data', 'id'],
  ]);
  if (!teacherId) throw new Error('Teacher id missing');

  const teacherLogin = await requestJson('/api/auth/user/login', {
    method: 'POST',
    body: JSON.stringify({ email: teacherEmail, password: teacherPassword }),
  });

  const teacherToken = extractValue(teacherLogin.json, [
    ['data', 'token'],
    ['data', 'data', 'token'],
    ['token'],
  ]);
  if (!teacherToken) throw new Error('Teacher token missing');

  const courseCreate = await requestJson('/api/courses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${orgToken}` },
    body: JSON.stringify({
      Name: `Firebase RealtimeDB Course ${suffix2}`,
      Description: 'Firebase Realtime DB validation course',
    }),
  });

  const courseId = extractValue(courseCreate.json, [
    ['data', 'id'],
    ['data', 'data', 'id'],
  ]);
  if (!courseId) throw new Error('Course id missing');

  const sendResponse = await requestJson('/api/chats/course/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: JSON.stringify({ course_id: courseId, content: messageContent }),
  });

  const sentMessage = extractValue(sendResponse.json, [
    ['data', 'message'],
    ['data', 'data', 'message'],
  ]);
  if (!sentMessage?.id) throw new Error('Saved message id missing');

  const dbCourseRows = await prisma.$queryRaw`SELECT id, type FROM chats WHERE course_id = ${courseId} LIMIT 1`;
  const dbCourseChat = dbCourseRows?.[0] || null;
  if (!dbCourseChat) throw new Error('MySQL course chat row not found');

  const dbMessageRows = await prisma.$queryRaw`SELECT id, chat_id, sender_user_id, content, sent_at, is_deleted FROM messages WHERE chat_id = ${dbCourseChat.id} AND content = ${messageContent} LIMIT 1`;
  const dbMessage = dbMessageRows?.[0] || null;
  if (!dbMessage) throw new Error('MySQL message row not found');

  result.mysqlVerified = true;
  result.courseId = courseId;
  result.mysqlMessageId = dbMessage.id;

  try {
    let realtimeMessage = null;
    if (db) {
      for (let attempt = 0; attempt < 3 && !realtimeMessage; attempt += 1) {
        const snapshot = await db.ref(`course_chats/${courseId}/messages`).get();
        if (snapshot.exists()) {
          const messages = [];
          snapshot.forEach((child) => {
            if (child.val().content === messageContent) {
              messages.push({ key: child.key, ...child.val() });
            }
          });
          realtimeMessage = messages[0] || null;
        }
        if (!realtimeMessage) await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    if (realtimeMessage) {
      result.realtimeDbVerified = true;
      result.realtimeDbMessageKey = realtimeMessage.key;
      result.realtimeDbPath = `course_chats/${courseId}/messages/${realtimeMessage.key}`;
      result.realtimeDbPayload = realtimeMessage;
    } else {
      result.realtimeDbError = db
        ? 'Message not found in Realtime DB after 3 attempts'
        : 'Realtime DB not initialized';
    }
  } catch (dbError) {
    result.realtimeDbVerified = false;
    result.realtimeDbError = dbError.message;
  }
} catch (error) {
  result.error = error.message;
} finally {
  await prisma.$disconnect();
}

console.log(JSON.stringify(result, null, 2));
