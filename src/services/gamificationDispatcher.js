import { awardXpSafe } from './gamificationService.js';

const log = {
  info: (msg, meta) => console.info('[gam:dispatch]', msg, meta ?? ''),
  warn: (msg, meta) => console.warn('[gam:dispatch]', msg, meta ?? ''),
};

const EVENT_MAP = {
  'lesson.completed': { eventType: 'LESSON_COMPLETE', sourceType: 'LESSON'    },
  'quiz.passed':      { eventType: 'QUIZ_PASS',       sourceType: 'QUIZ'      },
  'quiz.perfect':     { eventType: 'QUIZ_PERFECT',    sourceType: 'QUIZ'      },
  'course.completed': { eventType: null,              sourceType: 'COURSE'    },
  'daily.login':      { eventType: null,              sourceType: 'LOGIN'     },
  'flashcards.used':  { eventType: null,              sourceType: 'FLASHCARD' },
  'mindmap.opened':   { eventType: null,              sourceType: 'MINDMAP'   },
  'chatbot.used':     { eventType: null,              sourceType: 'CHATBOT'   },
};

const _lastFired = new Map();
const COOLDOWNS_MS = {
  'daily.login':    23 * 3_600_000,
  'flashcards.used': 2 *    60_000,
  'mindmap.opened':  5 *    60_000,
  'chatbot.used':    5 *    60_000,
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

/**
 * Dispatch a gamification event.
 * @param {{ studentId: number, event: string, sourceId: string|number, metadata?: object }} payload
 */
export function dispatch({ studentId, event, sourceId, metadata }) {
  const mapping = EVENT_MAP[event];
  if (!mapping) {
    log.warn('unknown event — ignored', { studentId, event });
    return;
  }
  if (_rateLimited(studentId, event)) {
    log.info('rate-limited', { studentId, event });
    return;
  }
  log.info('event', { studentId, event, sourceId });
  if (mapping.eventType) {
    awardXpSafe(studentId, mapping.eventType, mapping.sourceType, sourceId, metadata ?? null);
  }
}
