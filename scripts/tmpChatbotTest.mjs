const base = 'http://localhost:5000';

const loginResp = await fetch(`${base}/api/auth/user/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'teacher@example.com', password: 'Teach@1234' }),
});

const loginJson = await loginResp.json();
const token = loginJson?.data?.token;

if (!token) {
  throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

const context = {
  course_id: 2,
  subject_id: 2,
  lesson_id: 4,
  enable_chatbot: true,
};

async function send(content) {
  const resp = await fetch(`${base}/api/chats/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...context, content }),
  });

  const body = await resp.json();
  if (!resp.ok) {
    throw new Error(`Request failed (${resp.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

const q1 = await send('احكيلي عن القدس');
const chatId = q1.data.chat_id;
const q2 = await send('شو مكنة القدس؟');
const q3 = await send('عن شو الدرس؟');
const q4 = await send('وليش مهمة؟');
const q5a = await send('لخصلي بسطر');
const q5b = await send('جاوبني بكلمتين');
const q6 = await send('اشرح نظرية النسبية');

const messagesResp = await fetch(`${base}/api/chats/${chatId}/messages?limit=20&offset=0`, {
  headers: { Authorization: `Bearer ${token}` },
});
const messagesJson = await messagesResp.json();

const words = (text) => String(text || '').trim().split(/\s+/u).filter(Boolean).length;

const result = {
  chat_id: chatId,
  q1: q1.data.chatbot_response?.answer,
  q2: q2.data.chatbot_response?.answer,
  q3: q3.data.chatbot_response?.answer,
  q4: q4.data.chatbot_response?.answer,
  q5a: q5a.data.chatbot_response?.answer,
  q5b: q5b.data.chatbot_response?.answer,
  q6: q6.data.chatbot_response?.answer,
  q6_confidence: q6.data.chatbot_response?.confidence,
  messages_count: messagesJson.data?.messages?.length,
  has_bot_message: Boolean(q1.data.bot_message),
  q5a_words: words(q5a.data.chatbot_response?.answer),
  q5b_words: words(q5b.data.chatbot_response?.answer),
};

console.log(JSON.stringify(result, null, 2));
