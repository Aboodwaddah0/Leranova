import prisma from '../utils/prisma.js';

const log = {
  info:  (msg, meta) => console.info('[social]', msg, meta ?? ''),
  error: (msg, meta) => console.error('[social]', msg, meta ?? ''),
};

const EVENT_LABELS = {
  LESSON_COMPLETE:   'Completed a lesson',
  QUIZ_PASS:         'Passed a quiz',
  QUIZ_PERFECT:      'Perfect quiz score',
  DAILY_LOGIN:       'Logged in',
  FLASHCARD_SESSION: 'Used flashcards',
  MINDMAP_SESSION:   'Explored a mindmap',
  CHATBOT_SESSION:   'Used AI chat',
};

// 5-min per-student cache
const _cache = new Map();
const CACHE_TTL = 5 * 60_000;

function _scopeFilter(orgId, mode) {
  return mode === 'SCHOOL'
    ? { user: { student: { OrgId: orgId } } }
    : { user: { academy_user: { OrgId: orgId } } };
}

function _weeklyStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function _weekEndAt() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const daysToSunday = day === 0 ? 0 : 7 - day;
  const end = new Date(now);
  end.setUTCDate(now.getUTCDate() + daysToSunday);
  end.setUTCHours(23, 59, 59, 0);
  return end;
}

function _emptyResult(myStudentId) {
  return {
    weeklyChallenge: {
      title: 'Weekly XP Sprint',
      description: 'Earn the most XP before Sunday midnight',
      type: 'XP_RACE',
      endsAt: _weekEndAt().toISOString(),
      myRank: null,
      myWeeklyXp: 0,
      leader: null,
      leaderboard: [],
    },
    xpRace:            { me: null, above: null, below: null, xpToOvertake: null },
    streakCompetition: [],
    achievementShowcase: { myCount: 0, topAchievers: [] },
    socialFeed:        [],
    topPerformer:      null,
    myRank:            { rank: null, totalXp: 0, level: 1, weeklyXp: 0 },
  };
}

export async function getStudentSocial(myStudentId, orgId, mode) {
  const cacheKey = `${myStudentId}:${orgId}:${mode}`;
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const weeklyStart  = _weeklyStart();
    const scopeFilter  = _scopeFilter(orgId, mode);
    const d3           = new Date(Date.now() - 3 * 86_400_000);

    // Phase 1: all org students with XP, level, name, streak
    const summaries = await prisma.student_xp_summary.findMany({
      where: scopeFilter,
      select: {
        studentId: true,
        totalXp:   true,
        level:     true,
        user: {
          select: {
            name: true,
            studentStreak: { select: { currentStreak: true, longestStreak: true } },
          },
        },
      },
    });

    if (summaries.length === 0) {
      const empty = _emptyResult(myStudentId);
      _cache.set(cacheKey, { ts: Date.now(), data: empty });
      return empty;
    }

    const studentIds = summaries.map(s => s.studentId);
    const nameMap    = new Map(summaries.map(s => [s.studentId, s.user?.name || 'Student']));
    const infoMap    = new Map(summaries.map(s => [s.studentId, s]));

    // Phase 2: parallel queries
    const [weeklyGroups, achievementGroups, socialFeedRaw, myWeeklyXpRow, myAchievementCount] = await Promise.all([
      prisma.xp_event.groupBy({
        by:    ['studentId'],
        where: { studentId: { in: studentIds }, createdAt: { gte: weeklyStart } },
        _sum:  { xpAwarded: true },
      }),
      prisma.student_achievement.groupBy({
        by:    ['studentId'],
        where: { studentId: { in: studentIds } },
        _count: { achievementKey: true },
      }),
      prisma.xp_event.findMany({
        where:   { studentId: { in: studentIds }, createdAt: { gte: d3 } },
        orderBy: { createdAt: 'desc' },
        take:    25,
        select:  { studentId: true, eventType: true, xpAwarded: true, createdAt: true },
      }),
      prisma.xp_event.aggregate({
        _sum:  { xpAwarded: true },
        where: { studentId: myStudentId, createdAt: { gte: weeklyStart } },
      }),
      prisma.student_achievement.count({ where: { studentId: myStudentId } }),
    ]);

    // ── Weekly leaderboard ──────────────────────────────────────────────────
    const weeklyXpMap = new Map(weeklyGroups.map(r => [r.studentId, r._sum.xpAwarded ?? 0]));
    const myWeeklyXp  = myWeeklyXpRow._sum.xpAwarded ?? 0;

    const weeklyLeaderboard = summaries
      .map(s => ({
        studentId: s.studentId,
        name:      s.user?.name || 'Student',
        weeklyXp:  weeklyXpMap.get(s.studentId) ?? 0,
        level:     s.level,
      }))
      .filter(s => s.weeklyXp > 0)
      .sort((a, b) => b.weeklyXp - a.weeklyXp);

    let myWeeklyRank = null;
    const myWeeklyIdx = weeklyLeaderboard.findIndex(s => s.studentId === myStudentId);
    if (myWeeklyIdx !== -1) myWeeklyRank = myWeeklyIdx + 1;

    const weeklyTop5 = weeklyLeaderboard.slice(0, 10).map((s, i) => ({ ...s, rank: i + 1 }));
    const topPerformer = weeklyTop5[0] ?? null;

    // ── Total XP leaderboard & XP race ─────────────────────────────────────
    const xpLeaderboard = summaries
      .sort((a, b) => b.totalXp - a.totalXp)
      .map((s, i) => ({ rank: i + 1, studentId: s.studentId, name: s.user?.name || 'Student', totalXp: s.totalXp, level: s.level }));

    const myXpIdx = xpLeaderboard.findIndex(s => s.studentId === myStudentId);
    const myXpEntry = myXpIdx !== -1 ? xpLeaderboard[myXpIdx] : null;
    const above = myXpIdx > 0 ? xpLeaderboard[myXpIdx - 1] : null;
    const below = myXpIdx !== -1 && myXpIdx < xpLeaderboard.length - 1 ? xpLeaderboard[myXpIdx + 1] : null;

    const xpRace = {
      me:           myXpEntry,
      above,
      below,
      xpToOvertake: above ? Math.max(0, above.totalXp - (myXpEntry?.totalXp ?? 0) + 1) : null,
    };

    // ── Streak competition ──────────────────────────────────────────────────
    const streakCompetition = summaries
      .map(s => ({
        studentId:    s.studentId,
        name:         s.user?.name || 'Student',
        currentStreak: s.user?.studentStreak?.currentStreak ?? 0,
        longestStreak: s.user?.studentStreak?.longestStreak ?? 0,
        level:        s.level,
      }))
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 10)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    // ── Achievement showcase ────────────────────────────────────────────────
    const achCountMap = new Map(achievementGroups.map(r => [r.studentId, r._count.achievementKey]));
    const topAchievers = achievementGroups
      .sort((a, b) => b._count.achievementKey - a._count.achievementKey)
      .slice(0, 5)
      .map((r, i) => ({
        rank:      i + 1,
        studentId: r.studentId,
        name:      nameMap.get(r.studentId) || 'Student',
        count:     r._count.achievementKey,
        isMe:      r.studentId === myStudentId,
      }));

    // ── Social feed ─────────────────────────────────────────────────────────
    const socialFeed = socialFeedRaw.map(e => ({
      studentId:   e.studentId,
      studentName: nameMap.get(e.studentId) || 'Student',
      eventType:   e.eventType,
      label:       EVENT_LABELS[e.eventType] || e.eventType,
      xpAwarded:   e.xpAwarded,
      occurredAt:  e.createdAt.toISOString(),
    }));

    // ── My rank summary ─────────────────────────────────────────────────────
    const myRank = {
      rank:     myXpEntry?.rank ?? null,
      totalXp:  myXpEntry?.totalXp ?? 0,
      level:    infoMap.get(myStudentId)?.level ?? 1,
      weeklyXp: myWeeklyXp,
      weeklyRank: myWeeklyRank,
    };

    const result = {
      weeklyChallenge: {
        title:       'Weekly XP Sprint',
        description: 'Earn the most XP before Sunday midnight',
        type:        'XP_RACE',
        endsAt:      _weekEndAt().toISOString(),
        myRank:      myWeeklyRank,
        myWeeklyXp,
        leader:      topPerformer
          ? { name: topPerformer.name, weeklyXp: topPerformer.weeklyXp, level: topPerformer.level }
          : null,
        leaderboard: weeklyTop5,
      },
      xpRace,
      streakCompetition,
      achievementShowcase: {
        myCount:     myAchievementCount,
        topAchievers,
      },
      socialFeed,
      topPerformer: topPerformer
        ? {
            name:         topPerformer.name,
            weeklyXp:     topPerformer.weeklyXp,
            level:        topPerformer.level,
            currentStreak: infoMap.get(topPerformer.studentId)?.user?.studentStreak?.currentStreak ?? 0,
          }
        : null,
      myRank,
    };

    _cache.set(cacheKey, { ts: Date.now(), data: result });
    log.info('computed', { myStudentId, orgId, orgSize: studentIds.length });
    return result;
  } catch (err) {
    log.error('failed', { myStudentId, orgId, err: err?.message });
    return _emptyResult(myStudentId);
  }
}
