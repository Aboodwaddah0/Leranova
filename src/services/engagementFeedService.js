import prisma from '../utils/prisma.js';

const XP_VALUES = {
  LESSON_COMPLETE:   10,
  QUIZ_PASS:         20,
  QUIZ_PERFECT:      10,
  DAILY_LOGIN:        5,
  FLASHCARD_SESSION:  5,
  MINDMAP_SESSION:    3,
  CHATBOT_SESSION:    3,
};

const EVENT_LABELS = {
  LESSON_COMPLETE:   'Completed a lesson',
  QUIZ_PASS:         'Passed a quiz',
  QUIZ_PERFECT:      'Perfect quiz score!',
  DAILY_LOGIN:       'Daily login bonus',
  FLASHCARD_SESSION: 'Flashcard study session',
  MINDMAP_SESSION:   'Explored a mindmap',
  CHATBOT_SESSION:   'AI tutor session',
};

const ACHIEVEMENT_LABELS = {
  FIRST_LESSON: { label: 'First Step',       xp: 15  },
  LESSON_10:    { label: 'Eager Learner',     xp: 30  },
  LESSON_50:    { label: 'Knowledge Seeker',  xp: 100 },
  FIRST_QUIZ:   { label: 'Quiz Taker',        xp: 20  },
  QUIZ_5:       { label: 'Quiz Master',       xp: 50  },
  PERFECT_QUIZ: { label: 'Perfectionist',     xp: 25  },
  STREAK_3:     { label: 'On a Roll',         xp: 20  },
  STREAK_7:     { label: 'Week Warrior',      xp: 50  },
  STREAK_30:    { label: 'Unstoppable',       xp: 150 },
  XP_100:       { label: 'Century Club',      xp: 10  },
  XP_500:       { label: 'XP Hunter',         xp: 25  },
};

function _weeklyStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export async function getEngagementFeed(studentId) {
  const d90         = new Date(Date.now() - 90 * 86_400_000);
  const weeklyStart = _weeklyStart();

  const [xpRow, streakRow, recentEvents, recentAchievements, missionStats] = await Promise.all([
    prisma.student_xp_summary.findUnique({ where: { studentId } }),
    prisma.student_streak.findUnique({ where: { studentId } }),
    prisma.xp_event.findMany({
      where:   { studentId, createdAt: { gte: d90 } },
      orderBy: { createdAt: 'desc' },
      take:    200,
      select:  { eventType: true, xpAwarded: true, createdAt: true },
    }),
    prisma.student_achievement.findMany({
      where:   { studentId, unlockedAt: { gte: d7 } },
      orderBy: { unlockedAt: 'desc' },
      take:    5,
      select:  { achievementKey: true, unlockedAt: true },
    }),
    prisma.student_mission_progress.findMany({
      where:  { studentId, periodStart: { gte: weeklyStart } },
      select: { missionKey: true, completed: true },
    }),
  ]);

  const totalXp = xpRow?.totalXp ?? 0;
  const level   = xpRow?.level   ?? 1;

  const today        = new Date().toISOString().slice(0, 10);
  const lastActivity = streakRow?.lastActivityAt?.toISOString().slice(0, 10) ?? null;
  const engagedToday = lastActivity === today;

  const daily  = missionStats.filter(m => m.missionKey.startsWith('DAILY_'));
  const weekly = missionStats.filter(m => m.missionKey.startsWith('WEEKLY_'));

  return {
    totalXp,
    level,
    xpInLevel:      totalXp % 100,
    currentStreak:  streakRow?.currentStreak ?? 0,
    engagedToday,
    lastActivityAt: streakRow?.lastActivityAt?.toISOString() ?? null,
    feed: recentEvents.map(e => ({
      type:      e.eventType,
      label:     EVENT_LABELS[e.eventType] || e.eventType,
      xp:        e.xpAwarded ?? XP_VALUES[e.eventType] ?? 0,
      createdAt: e.createdAt.toISOString(),
    })),
    recentAchievements: recentAchievements.map(a => ({
      key:        a.achievementKey,
      label:      ACHIEVEMENT_LABELS[a.achievementKey]?.label || a.achievementKey,
      xp:         ACHIEVEMENT_LABELS[a.achievementKey]?.xp   || 0,
      unlockedAt: a.unlockedAt.toISOString(),
    })),
    missionsSummary: {
      dailyDone:   daily.filter(m => m.completed).length,
      dailyTotal:  daily.length,
      weeklyDone:  weekly.filter(m => m.completed).length,
      weeklyTotal: weekly.length,
    },
  };
}
