const API = 'http://localhost:5000/api';

const USER = { email: 'academy_student@learnova.com', password: '12345678' };

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
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(json)}`);
  }

  return json;
};

const login = async () => {
  const result = await request('/auth/user/login', {
    method: 'POST',
    body: { email: USER.email, password: USER.password },
  });
  return result?.data?.token || result?.token;
};

const unwrapData = (res, fallback = null) => res?.data ?? fallback;

const main = async () => {
  const token1 = await login();
  const chats = unwrapData(await request('/chats', { token: token1 }), []);
  const chatId = Number(chats?.[0]?.id);
  const messages = unwrapData(await request(`/chats/${chatId}/messages`, { token: token1 }), []);
  const target = messages.find((m) => !m.isDeleted) || messages[messages.length - 1];
  const messageId = Number(target?.id);

  const reacted = unwrapData(await request(`/chats/messages/${messageId}/reaction`, {
    method: 'PATCH',
    token: token1,
    body: { reaction: '❤️' },
  }), null);

  const token2 = await login();
  const messagesReloaded = unwrapData(await request(`/chats/${chatId}/messages`, { token: token2 }), []);
  const after = messagesReloaded.find((m) => Number(m.id) === messageId);

  console.log(JSON.stringify({
    chatId,
    messageId,
    setAction: reacted?.action,
    setMyReaction: reacted?.message?.myReaction,
    persistedAfterRelogin: {
      myReaction: after?.myReaction ?? null,
      reactions: after?.reactions || [],
    },
  }, null, 2));
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
