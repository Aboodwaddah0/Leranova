const API = 'http://localhost:5000/api';

const USERS = [
  { email: 'academy_student@learnova.com', password: '12345678' },
  { email: 'academy_buyer@learnova.com', password: '12345678' },
];

const request = async (path, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(json)}`);
  }

  return json;
};

const login = async ({ email, password }) => {
  const variants = [
    { email, password },
    { Email: email, password },
    { email, Password: password },
    { Email: email, Password: password },
  ];

  for (const body of variants) {
    try {
      const result = await request('/auth/user/login', { method: 'POST', body });
      const token = result?.data?.token || result?.token;
      if (token) {
        return token;
      }
    } catch {
      // try next payload variant
    }
  }

  throw new Error(`Unable to login with ${email}`);
};

const unwrapData = (result, fallback = null) => result?.data ?? fallback;

const main = async () => {
  const tokenA = await login(USERS[0]);
  const tokenB = await login(USERS[1]);

  const chatsA = unwrapData(await request('/chats', { token: tokenA }), []);
  if (!Array.isArray(chatsA) || !chatsA.length) {
    throw new Error('No chats found for user A');
  }

  const chatId = Number(chatsA[0].id);

  const sendB = await request(`/chats/${chatId}/messages`, {
    method: 'POST',
    token: tokenB,
    body: { content: `reaction_e2e_seed_${Date.now()}` },
  });

  const seedMessage = unwrapData(sendB, null);
  const messageId = Number(seedMessage?.id);
  if (!messageId) {
    throw new Error('Failed to create seed message');
  }

  const react1 = unwrapData(await request(`/chats/messages/${messageId}/reaction`, {
    method: 'PATCH',
    token: tokenA,
    body: { reaction: '👍' },
  }), null);

  const react2 = unwrapData(await request(`/chats/messages/${messageId}/reaction`, {
    method: 'PATCH',
    token: tokenA,
    body: { reaction: '😂' },
  }), null);

  const react3 = unwrapData(await request(`/chats/messages/${messageId}/reaction`, {
    method: 'PATCH',
    token: tokenA,
    body: { reaction: '😂' },
  }), null);

  const messagesAfter = unwrapData(await request(`/chats/${chatId}/messages`, { token: tokenA }), []);
  const target = Array.isArray(messagesAfter)
    ? messagesAfter.find((msg) => Number(msg.id) === messageId)
    : null;

  console.log(JSON.stringify({
    chatId,
    messageId,
    step1: { action: react1?.action, myReaction: react1?.message?.myReaction, reactions: react1?.message?.reactions || [] },
    step2: { action: react2?.action, myReaction: react2?.message?.myReaction, reactions: react2?.message?.reactions || [] },
    step3: { action: react3?.action, myReaction: react3?.message?.myReaction, reactions: react3?.message?.reactions || [] },
    afterReload: {
      myReaction: target?.myReaction ?? null,
      reactions: target?.reactions || [],
    },
  }, null, 2));
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
