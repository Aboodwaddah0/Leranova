import 'dotenv/config';

const baseUrl = 'http://localhost:5000';
const payload = {
  content: 'test from postman',
  course_id: 5,
};

const extract = (json, paths) => {
  for (const path of paths) {
    let cur = json;
    let ok = true;
    for (const key of path) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, key)) {
        cur = cur[key];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && cur !== undefined && cur !== null) return cur;
  }
  return null;
};

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
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { ok: response.ok, status: response.status, json };
};

const result = {
  step: 'start',
  apiStatus: null,
  apiBody: null,
  firebaseFound: false,
  firebasePath: 'course_chats/5/messages',
  error: null,
};

try {
  result.step = 'org_login';
  const orgLogin = await api('/api/auth/organization/login', {
    method: 'POST',
    body: { Email: 'academy@test.com', password: 'Test@12345' },
  });

  const orgToken = extract(orgLogin.json, [
    ['data', 'token'],
    ['data', 'data', 'token'],
    ['token'],
  ]);

  if (!orgToken) {
    throw new Error(`Org login failed: status=${orgLogin.status}, body=${JSON.stringify(orgLogin.json)}`);
  }

  const suffix = Date.now();
  const teacherEmail = `runtime.firebase.${suffix}@test.com`;
  const teacherPassword = 'Password123!';

  result.step = 'create_teacher';
  const teacherCreate = await api('/api/teachers', {
    method: 'POST',
    token: orgToken,
    body: {
      name: `Runtime Firebase Teacher ${suffix}`,
      email: teacherEmail,
      password: teacherPassword,
      work: 'Science',
      specialization: 'Physics',
      bio: 'Runtime firebase verification teacher',
    },
  });

  const teacherId = extract(teacherCreate.json, [
    ['data', 'id'],
    ['data', 'data', 'id'],
  ]);

  if (!teacherId) {
    throw new Error(`Teacher create failed: status=${teacherCreate.status}, body=${JSON.stringify(teacherCreate.json)}`);
  }

  result.step = 'assign_teacher_to_course5';
  const subjectCreate = await api('/api/courses/5/subjects', {
    method: 'POST',
    token: orgToken,
    body: {
      teacherId,
      name: `Runtime Subject ${suffix}`,
      Description: 'Runtime subject for firebase verification',
    },
  });

  if (!subjectCreate.ok) {
    throw new Error(`Subject create/assignment failed: status=${subjectCreate.status}, body=${JSON.stringify(subjectCreate.json)}`);
  }

  result.step = 'teacher_login';
  const teacherLogin = await api('/api/auth/user/login', {
    method: 'POST',
    body: { email: teacherEmail, password: teacherPassword },
  });

  const teacherToken = extract(teacherLogin.json, [
    ['data', 'token'],
    ['data', 'data', 'token'],
    ['token'],
  ]);

  if (!teacherToken) {
    throw new Error(`Teacher login failed: status=${teacherLogin.status}, body=${JSON.stringify(teacherLogin.json)}`);
  }

  result.step = 'post_course_message';
  const send = await api('/api/chats/course/messages', {
    method: 'POST',
    token: teacherToken,
    body: payload,
  });

  result.apiStatus = send.status;
  result.apiBody = send.json;

  if (!send.ok) {
    throw new Error(`POST /api/chats/course/messages failed: status=${send.status}, body=${JSON.stringify(send.json)}`);
  }

  const { db } = await import('../src/config/firebase.js');
  if (!db) {
    throw new Error('Firebase db is not initialized in runtime verifier');
  }

  result.step = 'verify_firebase';
  const snapshot = await db.ref('course_chats/5/messages').get();
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const value = child.val();
      if (value?.content === payload.content) {
        result.firebaseFound = true;
        result.firebaseKey = child.key;
      }
    });
  }

  if (!result.firebaseFound) {
    throw new Error('Message was not found at Firebase path course_chats/5/messages');
  }

  result.step = 'done';
} catch (error) {
  result.error = error.message;
}

console.log(JSON.stringify(result, null, 2));
