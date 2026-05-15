import { awardXpSafe, awardXpReturning, touchStreak } from './gamificationService.js';

const log = {
  info: (msg, meta) => console.info('[gam:dispatch]', msg, meta ?? ''),
  warn: (msg, meta) => console.warn('[gam:dispatch]', msg, meta ?? ''),
};

const EVENT_MAP = {
  'lesson.completed': { eventType: 'LESSON_COMPLETE',   sourceType: 'LESSON'                       },
  'quiz.passed':      { eventType: 'QUIZ_PASS',         sourceType: 'QUIZ'                         },
  'quiz.perfect':     { eventType: 'QUIZ_PERFECT',      sourceType: 'QUIZ'                         },
  'course.completed': { eventType: null,                sourceType: 'COURSE'                       },
  'daily.login':      { eventType: 'DAILY_LOGIN',       sourceType: 'LOGIN',    dailyDedup: true   },
  'flashcards.used':  { eventType: 'FLASHCARD_SESSION', sourceType: 'FLASHCARD', dailyDedup: true  },
  'mindmap.opened':   { eventType: 'MINDMAP_SESSION',   sourceType: 'MINDMAP',  dailyDedup: true   },
  'chatbot.used':     { eventType: 'CHATBOT_SESSION',   sourceType: 'CHATBOT',  dailyDedup: true   },
  // Streak-only events — no XP, just keep the streak alive.
  // Rate-limiting is skipped for these because _updateStreak is idempotent (same-day check in DB).
  'lesson.viewed':    { eventType: null, sourceType: 'LESSON', streakOnly: true },
  'quiz.attempted':   { eventType: null, sourceType: 'QUIZ',   streakOnly: true },
};

// XP-awarding events only — streakOnly events bypass this to keep streak updates instant.
const _lastFired = new Map();
const COOLDOWNS_MS = {
  'daily.login':     23 * 3_600_000,
  'flashcards.used':  2 *    60_000,
  'mindmap.opened':   5 *    60_000,
  'chatbot.used':     5 *    60_000,
};

function _rateLimited(studentId, event) {
  const cooldown = COOLDOWNS_MS[event];
  if (!cooldown) return false;
  const key = `${studentId}:${event}`;
  const last = _lastFired.get(key) ?? 0;
  if (Date.now() - last < cooldown) return true;
  _lastFired.set(key, Date.now());
  return false;
}

function _resolveSourceId(mapping, sourceId) {
  if (!mapping.dailyDedup) return sourceId;
  if (sourceId != null) return sourceId;
  return parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10);
}

/**
 * Dispatch a gamification event.
 * streakOnly events always call touchStreak — no rate-limiting, DB handles idempotency.
 * XP events are rate-limited in-process; XP dedup is also enforced at DB level.
 * @param {{ studentId: number, event: string, sourceId?: number|null, metadata?: object }} payload
 */
const EMPTY_REWARD = { xpEarned: 0, streakUpdated: false, achievementsUnlocked: [], levelUp: null, toastMessage: null, sound: null };

function _buildReward(result, event) {
  if (!result || result.xpAwarded === 0) return EMPTY_REWARD;
  const levelUp = (result.levelAfter > result.levelBefore) ? result.levelAfter : null;
  const achievementsUnlocked = result.newAchievements ?? [];
  let toastMessage, sound;
  if (levelUp) {
    toastMessage = `Level Up! You're now Level ${levelUp}`;
    sound = 'levelUp';
  } else if (achievementsUnlocked.length > 0) {
    toastMessage = `Achievement Unlocked: ${achievementsUnlocked[0].label}`;
    sound = 'achievement';
  } else {
    toastMessage = `+${result.xpAwarded} XP earned`;
    sound = 'xp';
  }
  return { xpEarned: result.xpAwarded, streakUpdated: result.streakUpdated, achievementsUnlocked, levelUp, toastMessage, sound };
}

/**
 * Awaitable dispatcher — awards XP synchronously and returns a normalized
 * reward payload `{ xpEarned, streakUpdated, achievementsUnlocked, levelUp, toastMessage, sound }`.
 * Use this when the caller needs to surface rewards to the frontend.
 */
export async function dispatchGamificationEvent({ studentId, event, sourceId, metadata }) {
  const mapping = EVENT_MAP[event];
  if (!mapping) {
    log.warn('unknown event — ignored (sync)', { studentId, event });
    return EMPTY_REWARD;
  }

  if (mapping.streakOnly) {
    touchStreak(studentId);
    return EMPTY_REWARD;
  }

  if (!mapping.eventType) {
    touchStreak(studentId);
    return EMPTY_REWARD;
  }

  if (_rateLimited(studentId, event)) {
    log.info('rate-limited (sync)', { studentId, event });
    return EMPTY_REWARD;
  }

  log.info('xp event (sync)', { studentId, event, sourceId });
  const resolvedSourceId = _resolveSourceId(mapping, sourceId);
  const result = await awardXpReturning(studentId, mapping.eventType, mapping.sourceType, resolvedSourceId, metadata ?? null);
  return _buildReward(result, event);
}

/**
 * Merge two reward payloads into one, taking the highest-priority sound/toast.
 */
export function mergeRewards(r1, r2) {
  if (!r1) return r2 ?? EMPTY_REWARD;
  if (!r2) return r1;
  const xpEarned = (r1.xpEarned || 0) + (r2.xpEarned || 0);
  const achievementsUnlocked = [...(r1.achievementsUnlocked || []), ...(r2.achievementsUnlocked || [])];
  const levelUp = r2.levelUp ?? r1.levelUp;
  let toastMessage, sound;
  if (levelUp) {
    toastMessage = `Level Up! You're now Level ${levelUp}`;
    sound = 'levelUp';
  } else if (achievementsUnlocked.length > 0) {
    toastMessage = `Achievement Unlocked: ${achievementsUnlocked[0].label}`;
    sound = 'achievement';
  } else if (xpEarned > 0) {
    toastMessage = `+${xpEarned} XP earned`;
    sound = 'xp';
  } else {
    toastMessage = null;
    sound = null;
  }
  return {
    xpEarned,
    streakUpdated: r1.streakUpdated || r2.streakUpdated,
    achievementsUnlocked,
    levelUp,
    toastMessage,
    sound,
  };
}

export function dispatch({ studentId, event, sourceId, metadata }) {
  const mapping = EVENT_MAP[event];
  if (!mapping) {
    log.warn('unknown event — ignored', { studentId, event });
    return;
  }

  // Streak-only: always run, skip rate-limit (DB _updateStreak is idempotent)
  if (mapping.streakOnly) {
    log.info('streak touch', { studentId, event, sourceId });
    touchStreak(studentId);
    return;
  }

  if (_rateLimited(studentId, event)) {
    log.info('rate-limited', { studentId, event });
    return;
  }

  log.info('xp event', { studentId, event, sourceId });
  if (mapping.eventType) {
    const resolvedSourceId = _resolveSourceId(mapping, sourceId);
    awardXpSafe(studentId, mapping.eventType, mapping.sourceType, resolvedSourceId, metadata ?? null);
  }
}
