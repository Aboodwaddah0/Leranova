import AppError from '../utils/appError.js';

const WINDOW_MS = Number(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS || 60_000);
const MAX_REQUESTS = Number(process.env.CHATBOT_RATE_LIMIT_MAX || 20);

const store = new Map();

const cleanup = () => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now - record.windowStart > WINDOW_MS * 2) {
      store.delete(key);
    }
  }
};

setInterval(cleanup, WINDOW_MS * 5).unref();

export const chatbotRateLimiter = (req, _res, next) => {
  const userId = req.user?.id;
  if (!userId) return next();

  const now = Date.now();
  const key = String(userId);
  const record = store.get(key);

  if (!record || now - record.windowStart > WINDOW_MS) {
    store.set(key, { windowStart: now, count: 1 });
    return next();
  }

  record.count += 1;
  if (record.count > MAX_REQUESTS) {
    return next(new AppError(`Too many requests. Limit is ${MAX_REQUESTS} per minute.`, 429));
  }

  return next();
};
