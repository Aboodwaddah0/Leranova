import prisma from '../utils/prisma.js';

const log = {
  info:  (msg, ...args) => console.info('[gamification]', msg, ...args),
  error: (msg, ...args) => console.error('[gamification]', msg, ...args),
};

const XP_VALUES = {
  LESSON_COMPLETE: 10,
  QUIZ_PASS: 20,
  QUIZ_PERFECT: 10,
  DAILY_LOGIN: 5,
  FLASHCARD_SESSION: 5,
  MINDMAP_SESSION: 3,
  CHATBOT_SESSION: 3,
};

const ACHIEVEMENTS = {
  FIRST_LESSON: { key: 'FIRST_LESSON', label: 'First Step', xp: 15 },
  LESSON_10:    { key: 'LESSON_10',    label: 'Eager Learner', xp: 30 },
  LESSON_50:    { key: 'LESSON_50',    label: 'Knowledge Seeker', xp: 100 },
  FIRST_QUIZ:   { key: 'FIRST_QUIZ',   label: 'Quiz Taker', xp: 20 },
  QUIZ_5:       { key: 'QUIZ_5',       label: 'Quiz Master', xp: 50 },
  PERFECT_QUIZ: { key: 'PERFECT_QUIZ', label: 'Perfectionist', xp: 25 },
  STREAK_3:     { key: 'STREAK_3',     label: 'On a Roll', xp: 20 },
  STREAK_7:     { key: 'STREAK_7',     label: 'Week Warrior', xp: 50 },
  STREAK_30:    { key: 'STREAK_30',    label: 'Unstoppable', xp: 150 },
  XP_100:       { key: 'XP_100',       label: 'Century Club', xp: 10 },
  XP_500:       { key: 'XP_500',       label: 'XP Hunter', xp: 25 },
};

const MISSIONS = {
  DAILY: [
    { key: 'DAILY_LESSON_1',   label: 'Daily Learner',  description: 'Complete 1 lesson today',         goal: 1, eventType: 'LESSON_COMPLETE',  xp: 10 },
    { key: 'DAILY_LESSON_3',   label: 'Triple Learner', description: 'Complete 3 lessons today',        goal: 3, eventType: 'LESSON_COMPLETE',  xp: 25 },
    { key: 'DAILY_QUIZ_1',     label: 'Daily Quiz',     description: 'Pass 1 quiz today',               goal: 1, eventType: 'QUIZ_PASS',        xp: 15 },
    { key: 'DAILY_FLASHCARD_1',label: 'Flash Learner',  description: 'Use flashcards once today',       goal: 1, eventType: 'FLASHCARD_SESSION', xp: 10 },
    { key: 'DAILY_CHATBOT_1',  label: 'AI Explorer',    description: 'Ask the AI chatbot today',        goal: 1, eventType: 'CHATBOT_SESSION',   xp: 8  },
  ],
  WEEKLY: [
    { key: 'WEEKLY_LESSON_5',    label: 'Weekly Scholar',     description: 'Complete 5 lessons this week',          goal: 5,  eventType: 'LESSON_COMPLETE',  xp: 40 },
    { key: 'WEEKLY_LESSON_10',   label: 'Power Learner',      description: 'Complete 10 lessons this week',         goal: 10, eventType: 'LESSON_COMPLETE',  xp: 75 },
    { key: 'WEEKLY_QUIZ_3',      label: 'Quiz Week',          description: 'Pass 3 quizzes this week',              goal: 3,  eventType: 'QUIZ_PASS',        xp: 50 },
    { key: 'WEEKLY_PERFECT_2',   label: 'Perfect Week',       description: 'Score 100% on 2 quizzes this week',     goal: 2,  eventType: 'QUIZ_PERFECT',     xp: 60 },
    { key: 'WEEKLY_FLASHCARD_3', label: 'Card Collector',     description: 'Use flashcards on 3 lessons this week', goal: 3,  eventType: 'FLASHCARD_SESSION', xp: 30 },
  ],
};

export const computeLevel = (totalXp) => Math.floor(totalXp / 100) + 1;

function _getPeriodStart(type) {
  const now = new Date();
  if (type === 'DAILY') return new Date(now.toISOString().slice(0, 10));
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

async function _awardBonusXp(studentId, xp) {
  const updated = await prisma.student_xp_summary.upsert({
    where: { studentId },
    create: { studentId, totalXp: xp, level: computeLevel(xp) },
    update: { totalXp: { increment: xp } },
  });
  const newLevel = computeLevel(updated.totalXp);
  if (newLevel !== updated.level) {
    await prisma.student_xp_summary.update({ where: { studentId }, data: { level: newLevel } });
  }
}

async function _updateStreak(tx, studentId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = await tx.student_streak.findUnique({ where: { studentId } });

  if (!row) {
    await tx.student_streak.create({
      data: { studentId, currentStreak: 1, longestStreak: 1, lastActivityAt: new Date(today) },
    });
    return;
  }

  const last = row.lastActivityAt?.toISOString().slice(0, 10);
  if (last === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = last === yesterday ? row.currentStreak + 1 : 1;
  const longest = Math.max(newStreak, row.longestStreak);

  await tx.student_streak.update({
    where: { studentId },
    data: { currentStreak: newStreak, longestStreak: longest, lastActivityAt: new Date(today) },
  });
}

export async function touchStreak(studentId) {
  try {
    await prisma.$transaction(async (tx) => _updateStreak(tx, studentId));
  } catch (err) {
    console.error('[gamification] touchStreak error', err?.message);
  }
}

async function _updateMissions(studentId, eventType) {
  const dailyStart  = _getPeriodStart('DAILY');
  const weeklyStart = _getPeriodStart('WEEKLY');

  const relevant = [
    ...MISSIONS.DAILY.filter(m => m.eventType === eventType).map(m => ({ ...m, type: 'DAILY', periodStart: dailyStart })),
    ...MISSIONS.WEEKLY.filter(m => m.eventType === eventType).map(m => ({ ...m, type: 'WEEKLY', periodStart: weeklyStart })),
  ];
  if (!relevant.length) return;

  for (const mission of relevant) {
    const row = await prisma.student_mission_progress.upsert({
      where: { uq_mission_period: { studentId, missionKey: mission.key, periodStart: mission.periodStart } },
      create: { studentId, missionKey: mission.key, type: mission.type, progress: 1, goal: mission.goal, periodStart: mission.periodStart },
      update: { progress: { increment: 1 } },
    });
    if (!row.completed && row.progress >= mission.goal) {
      await prisma.student_mission_progress.update({
        where: { uq_mission_period: { studentId, missionKey: mission.key, periodStart: mission.periodStart } },
        data: { completed: true, xpAwarded: mission.xp },
      });
      await _awardBonusXp(studentId, mission.xp);
      log.info('mission completed', { studentId, missionKey: mission.key, xp: mission.xp });
    }
  }
}

async function _runAchievementCheck(studentId) {
  const [lessonCount, quizCount, perfectCount, xpRow, streakRow, existing] = await Promise.all([
    prisma.xp_event.count({ where: { studentId, eventType: 'LESSON_COMPLETE' } }),
    prisma.xp_event.count({ where: { studentId, eventType: 'QUIZ_PASS' } }),
    prisma.xp_event.count({ where: { studentId, eventType: 'QUIZ_PERFECT' } }),
    prisma.student_xp_summary.findUnique({ where: { studentId }, select: { totalXp: true } }),
    prisma.student_streak.findUnique({ where: { studentId }, select: { longestStreak: true } }),
    prisma.student_achievement.findMany({ where: { studentId }, select: { achievementKey: true } }),
  ]);

  const unlocked = new Set(existing.map(r => r.achievementKey));
  const totalXp  = xpRow?.totalXp ?? 0;
  const longest  = streakRow?.longestStreak ?? 0;

  const candidates = [
    [lessonCount >= 1,   'FIRST_LESSON'],
    [lessonCount >= 10,  'LESSON_10'],
    [lessonCount >= 50,  'LESSON_50'],
    [quizCount >= 1,     'FIRST_QUIZ'],
    [quizCount >= 5,     'QUIZ_5'],
    [perfectCount >= 1,  'PERFECT_QUIZ'],
    [longest >= 3,       'STREAK_3'],
    [longest >= 7,       'STREAK_7'],
    [longest >= 30,      'STREAK_30'],
    [totalXp >= 100,     'XP_100'],
    [totalXp >= 500,     'XP_500'],
  ];

  for (const [condition, key] of candidates) {
    if (!condition || unlocked.has(key)) continue;
    const a = ACHIEVEMENTS[key];
    await prisma.student_achievement.create({
      data: { studentId, achievementKey: key, xpAwarded: a.xp },
    }).catch(() => {});
    await _awardBonusXp(studentId, a.xp);
    log.info('achievement unlocked', { studentId, key, xp: a.xp });
  }
}

function triggerMissionProgress(studentId, eventType) {
  _updateMissions(studentId, eventType).catch(err =>
    log.error('missionProgress failed', { studentId, eventType, err: err.message })
  );
}

function triggerAchievementCheck(studentId) {
  _runAchievementCheck(studentId).catch(err =>
    log.error('achievementCheck failed', { studentId, err: err.message })
  );
}

async function awardXp(studentId, eventType, sourceType, sourceId, metadata) {
  const xp = XP_VALUES[eventType] ?? 0;
  if (!xp) return;

  const existing = await prisma.xp_event.findFirst({
    where: { studentId, eventType, sourceType, sourceId },
    select: { id: true },
  });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    await tx.xp_event.create({
      data: {
        studentId,
        eventType,
        xpAwarded: xp,
        sourceType,
        sourceId,
        ...(metadata != null ? { metadata } : {}),
      },
    });

    const xpRow = await tx.student_xp_summary.upsert({
      where: { studentId },
      create: { studentId, totalXp: xp, level: computeLevel(xp) },
      update: { totalXp: { increment: xp } },
    });

    const newLevel = computeLevel(xpRow.totalXp);
    if (newLevel !== xpRow.level) {
      await tx.student_xp_summary.update({ where: { studentId }, data: { level: newLevel } });
    }

    await _updateStreak(tx, studentId);
  });

  log.info('XP awarded', { studentId, eventType, xp, sourceType, sourceId });
  triggerMissionProgress(studentId, eventType);
  triggerAchievementCheck(studentId);
}

export function awardXpSafe(studentId, eventType, sourceType, sourceId, metadata) {
  log.info('hook triggered', { studentId, eventType, sourceType, sourceId });
  awardXp(studentId, eventType, sourceType, sourceId, metadata).catch((err) =>
    log.error('awardXp failed', { studentId, eventType, sourceType, sourceId, err: err.message })
  );
}

export async function getStudentStats(studentId) {
  const [xp, streak] = await Promise.all([
    prisma.student_xp_summary.findUnique({ where: { studentId } }),
    prisma.student_streak.findUnique({ where: { studentId } }),
  ]);
  return {
    totalXp: xp?.totalXp ?? 0,
    level: xp?.level ?? 1,
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
  };
}

export async function getOrgLeaderboard(orgId, mode = 'ACADEMY', limit = 10) {
  const scopeFilter = mode === 'SCHOOL'
    ? { user: { student: { OrgId: orgId } } }
    : { user: { academy_user: { OrgId: orgId } } };

  const rows = await prisma.student_xp_summary.findMany({
    where: scopeFilter,
    orderBy: { totalXp: 'desc' },
    take: limit,
    select: {
      studentId: true,
      totalXp: true,
      level: true,
      user: {
        select: {
          name: true,
          studentStreak: { select: { currentStreak: true } },
          _count: { select: { achievements: true } },
        },
      },
    },
  });

  return rows.map((row, index) => ({
    rank: index + 1,
    studentId: row.studentId,
    name: row.user?.name || 'Student',
    totalXp: row.totalXp,
    level: row.level,
    currentStreak: row.user?.studentStreak?.currentStreak ?? 0,
    achievementsCount: row.user?._count?.achievements ?? 0,
  }));
}

export async function getStudentRank(studentId, orgId, mode = 'ACADEMY') {
  const myRow = await prisma.student_xp_summary.findUnique({
    where: { studentId },
    select: { totalXp: true, level: true },
  });
  if (!myRow) return null;

  const scopeFilter = mode === 'SCHOOL'
    ? { user: { student: { OrgId: orgId } }, totalXp: { gt: myRow.totalXp } }
    : { user: { academy_user: { OrgId: orgId } }, totalXp: { gt: myRow.totalXp } };

  const ahead = await prisma.student_xp_summary.count({ where: scopeFilter });
  return { rank: ahead + 1, totalXp: myRow.totalXp, level: myRow.level };
}

export async function getStudentAchievements(studentId) {
  const unlocked = await prisma.student_achievement.findMany({
    where: { studentId },
    orderBy: { unlockedAt: 'desc' },
  });
  const unlockedKeys = new Set(unlocked.map(r => r.achievementKey));
  const locked = Object.values(ACHIEVEMENTS).filter(a => !unlockedKeys.has(a.key));
  return {
    unlocked: unlocked.map(r => ({ ...ACHIEVEMENTS[r.achievementKey], xpAwarded: r.xpAwarded, unlockedAt: r.unlockedAt })),
    locked: locked.map(a => ({ key: a.key, label: a.label, xp: a.xp })),
    latestUnlocked: unlocked[0]
      ? { key: unlocked[0].achievementKey, label: ACHIEVEMENTS[unlocked[0].achievementKey]?.label, unlockedAt: unlocked[0].unlockedAt }
      : null,
  };
}

export async function getStudentMissions(studentId) {
  const dailyStart  = _getPeriodStart('DAILY');
  const weeklyStart = _getPeriodStart('WEEKLY');

  const rows = await prisma.student_mission_progress.findMany({
    where: { studentId, periodStart: { in: [dailyStart, weeklyStart] } },
  });
  const progressMap = new Map(rows.map(r => [r.missionKey, r]));

  const build = (missions) =>
    missions.map(m => {
      const row = progressMap.get(m.key);
      return { key: m.key, label: m.label, description: m.description, goal: m.goal, xp: m.xp, progress: row?.progress ?? 0, completed: row?.completed ?? false };
    });

  return { daily: build(MISSIONS.DAILY), weekly: build(MISSIONS.WEEKLY) };
}

export async function getEngagementScore(studentId) {
  const weekStart = _getPeriodStart('WEEKLY');

  const [lessonWeek, quizWeek, flashcardWeek, chatbotWeek, streakRow, xpRow] = await Promise.all([
    prisma.xp_event.count({ where: { studentId, eventType: 'LESSON_COMPLETE',  createdAt: { gte: weekStart } } }),
    prisma.xp_event.count({ where: { studentId, eventType: 'QUIZ_PASS',        createdAt: { gte: weekStart } } }),
    prisma.xp_event.count({ where: { studentId, eventType: 'FLASHCARD_SESSION', createdAt: { gte: weekStart } } }),
    prisma.xp_event.count({ where: { studentId, eventType: 'CHATBOT_SESSION',  createdAt: { gte: weekStart } } }),
    prisma.student_streak.findUnique({ where: { studentId }, select: { currentStreak: true } }),
    prisma.student_xp_summary.findUnique({ where: { studentId }, select: { totalXp: true, level: true } }),
  ]);

  const streak = streakRow?.currentStreak ?? 0;
  const streakBonus = Math.min(streak * 2, 20);
  const raw = (lessonWeek * 10) + (quizWeek * 8) + (flashcardWeek * 4) + (chatbotWeek * 3) + streakBonus;
  const score = Math.min(raw, 100);

  return {
    score,
    breakdown: { lessons: lessonWeek, quizzes: quizWeek, flashcards: flashcardWeek, chatbot: chatbotWeek, streak },
    totalXp: xpRow?.totalXp ?? 0,
    level: xpRow?.level ?? 1,
  };
}

function _recommendedAction(activeDailyMissions, stats) {
  if (activeDailyMissions.length > 0) {
    const m = activeDailyMissions[0];
    return { type: 'mission', label: m.label, description: m.description };
  }
  if ((stats.currentStreak ?? 0) === 0) {
    return { type: 'streak', label: 'Start your streak', description: 'Complete a lesson to begin your daily streak' };
  }
  return { type: 'lesson', label: 'Keep learning', description: 'Complete a lesson to earn XP' };
}

export async function getStudentDashboard(studentId) {
  const [stats, missions, achievements, engagement] = await Promise.all([
    getStudentStats(studentId),
    getStudentMissions(studentId),
    getStudentAchievements(studentId),
    getEngagementScore(studentId),
  ]);

  const activeMissions = {
    daily:  missions.daily.filter(m => !m.completed).slice(0, 3),
    weekly: missions.weekly.filter(m => !m.completed).slice(0, 3),
  };

  return {
    stats,
    activeMissions,
    recentAchievement: achievements.latestUnlocked,
    engagement,
    recommendedAction: _recommendedAction(activeMissions.daily, stats),
  };
}

export async function getStreakLeaderboard(orgId, mode = 'ACADEMY', limit = 10) {
  const scopeFilter = mode === 'SCHOOL'
    ? { user: { student: { OrgId: orgId } } }
    : { user: { academy_user: { OrgId: orgId } } };

  const rows = await prisma.student_xp_summary.findMany({
    where: scopeFilter,
    select: {
      studentId: true,
      totalXp: true,
      level: true,
      user: {
        select: {
          name: true,
          studentStreak: { select: { currentStreak: true, longestStreak: true } },
        },
      },
    },
  });

  rows.sort((a, b) =>
    (b.user?.studentStreak?.currentStreak ?? 0) - (a.user?.studentStreak?.currentStreak ?? 0)
  );

  return rows.slice(0, limit).map((row, i) => ({
    rank: i + 1,
    studentId: row.studentId,
    name: row.user?.name || 'Student',
    currentStreak: row.user?.studentStreak?.currentStreak ?? 0,
    longestStreak: row.user?.studentStreak?.longestStreak ?? 0,
    totalXp: row.totalXp,
    level: row.level,
  }));
}

export async function getWeeklyLeaderboard(orgId, mode = 'ACADEMY', limit = 10) {
  const weekStart = _getPeriodStart('WEEKLY');
  const scopeFilter = mode === 'SCHOOL'
    ? { user: { student: { OrgId: orgId } } }
    : { user: { academy_user: { OrgId: orgId } } };

  const summaries = await prisma.student_xp_summary.findMany({
    where: scopeFilter,
    select: { studentId: true, level: true, user: { select: { name: true } } },
  });
  const studentIds = summaries.map(s => s.studentId);
  const infoMap = new Map(summaries.map(s => [s.studentId, { name: s.user?.name || 'Student', level: s.level }]));

  const weekly = await prisma.xp_event.groupBy({
    by: ['studentId'],
    where: { studentId: { in: studentIds }, createdAt: { gte: weekStart } },
    _sum: { xpAwarded: true },
    orderBy: { _sum: { xpAwarded: 'desc' } },
    take: limit,
  });

  return weekly.map((row, i) => ({
    rank: i + 1,
    studentId: row.studentId,
    name: infoMap.get(row.studentId)?.name || 'Student',
    weeklyXp: row._sum.xpAwarded ?? 0,
    level: infoMap.get(row.studentId)?.level ?? 1,
  }));
}
