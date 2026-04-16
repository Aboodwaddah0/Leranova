import 'dotenv/config';

const baseUrl = 'http://localhost:5000';

const api = async (path, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: response.status, ok: response.ok, json };
};

const extract = (json, paths) => {
  for (const path of paths) {
    let current = json;
    let found = true;
    for (const key of path) {
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

const result = {
  message: null,
  seen: null,
  typing: null,
  firebase: {},
  error: null,
};

try {
  const orgLogin = await api('/api/auth/organization/login', {
    method: 'POST',
    body: { Email: 'academy@test.com', password: 'Test@12345' },
  });
  const orgToken = extract(orgLogin.json, [['data', 'token'], ['data', 'data', 'token'], ['token']]);
  if (!orgToken) throw new Error(`Org login failed: ${JSON.stringify(orgLogin.json)}`);

  const suffix = Date.now();
  const teacherEmail = `feature.firebase.${suffix}@test.com`;
  const teacherPassword = 'Password123!';

  const teacherCreate = await api('/api/teachers', {
    method: 'POST',
    token: orgToken,
    body: {
      name: `Feature Firebase Teacher ${suffix}`,
      email: teacherEmail,
      password: teacherPassword,
      work: 'Science',
      specialization: 'Physics',
      bio: 'Realtime feature test teacher',
    },
  });
  const teacherId = extract(teacherCreate.json, [['data', 'id'], ['data', 'data', 'id']]);
  if (!teacherId) throw new Error(`Teacher create failed: ${JSON.stringify(teacherCreate.json)}`);

  const assign = await api('/api/courses/5/subjects', {
    method: 'POST',
    token: orgToken,
    body: {
      teacherId,
      name: `Feature Subject ${suffix}`,
      Description: 'Realtime feature test subject',
    },
  });
  if (!assign.ok) throw new Error(`Subject assignment failed: ${JSON.stringify(assign.json)}`);

  const teacherLogin = await api('/api/auth/user/login', {
    method: 'POST',
    body: { email: teacherEmail, password: teacherPassword },
  });
  const teacherToken = extract(teacherLogin.json, [['data', 'token'], ['data', 'data', 'token'], ['token']]);
  if (!teacherToken) throw new Error(`Teacher login failed: ${JSON.stringify(teacherLogin.json)}`);

  const messageText = '🔥 test message';
  const send = await api('/api/chats/course/messages', {
    method: 'POST',
    token: teacherToken,
    body: { content: messageText, course_id: 5 },
  });
  result.message = { status: send.status, body: send.json };
  if (!send.ok) throw new Error(`Send failed: ${JSON.stringify(send.json)}`);

  const messageId = extract(send.json, [['data', 'message', 'id'], ['data', 'data', 'message', 'id']]);
  if (!messageId) throw new Error('Missing message id from send response');

  const seen = await api('/api/chats/course/seen', {
    method: 'POST',
    token: teacherToken,
    body: { course_id: 5, message_id: messageId },
  });
  result.seen = { status: seen.status, body: seen.json };
  if (!seen.ok) throw new Error(`Seen failed: ${JSON.stringify(seen.json)}`);

  const typing = await api('/api/chats/course/typing', {
    method: 'POST',
    token: teacherToken,
    body: { course_id: 5, is_typing: true },
  });
  result.typing = { status: typing.status, body: typing.json };
  if (!typing.ok) throw new Error(`Typing failed: ${JSON.stringify(typing.json)}`);

  const { db } = await import('../src/config/firebase.js');
  if (!db) throw new Error('Firebase db not initialized');

  const messagesSnap = await db.ref('course_chats/5/messages').get();
  const typingSnap = await db.ref('course_chats/5/typing').get();
  const onlineSnap = await db.ref('course_chats/5/online').get();

  const snapshotToObject = (snapshot) => {
    if (!snapshot.exists()) return null;
    const out = {};
    snapshot.forEach((child) => {
      out[child.key] = child.val();
    });
    return out;
  };

  result.firebase.messages = snapshotToObject(messagesSnap);
  result.firebase.typing = snapshotToObject(typingSnap);
  result.firebase.online = snapshotToObject(onlineSnap);
  result.firebase.messageFound = Object.values(result.firebase.messages || {}).some((entry) => entry.content === messageText);
  result.firebase.seenFound = Object.values(result.firebase.messages || {}).some((entry) => {
    const seenBy = entry?.seen_by || {};
    return Object.prototype.hasOwnProperty.call(seenBy, String(teacherId)) && seenBy[String(teacherId)] === true;
  });
  result.firebase.typingFound = Boolean(result.firebase.typing && result.firebase.typing[String(teacherId)] === true);
  result.firebase.onlineFound = Boolean(result.firebase.online && result.firebase.online[String(teacherId)] === true);
} catch (error) {
  result.error = error.message;
}

console.log(JSON.stringify(result, null, 2));
