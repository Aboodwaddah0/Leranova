import prisma from '../utils/prisma.js';

const log = {
  info:  (msg, ...args) => console.info('[gamification]', msg, ...args),
  error: (msg, ...args) => console.error('[gamification]', msg, ...args),
};

const XP_VALUES = {
  LESSON_COMPLETE: 10,
  QUIZ_PASS: 20,
  QUIZ_PERFECT: 10,
};

export const computeLevel = (totalXp) => Math.floor(totalXp / 100) + 1;

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

export async function getOrgLeaderboard(orgId, limit = 10) {
  const rows = await prisma.student_xp_summary.findMany({
    where: {
      user: {
        academy_user: { OrgId: orgId },
      },
    },
    orderBy: { totalXp: 'desc' },
    take: limit,
    select: {
      studentId: true,
      totalXp: true,
      level: true,
      user: { select: { name: true } },
    },
  });

  return rows.map((row, index) => ({
    rank: index + 1,
    studentId: row.studentId,
    name: row.user?.name || 'Student',
    totalXp: row.totalXp,
    level: row.level,
  }));
}
