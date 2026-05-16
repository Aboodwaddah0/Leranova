import prisma from '../utils/prisma.js';

const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// 15-minute cache per teacher
const _cache   = new Map();
const CACHE_TTL = 15 * 60 * 1000;

const EVENT_LABELS = {
  LESSON_COMPLETE:   'Completed a lesson',
  QUIZ_PASS:         'Passed a quiz',
  QUIZ_PERFECT:      'Perfect quiz score!',
  DAILY_LOGIN:       'Daily login',
  FLASHCARD_SESSION: 'Used flashcards',
  MINDMAP_SESSION:   'Explored mindmap',
  CHATBOT_SESSION:   'Used AI chatbot',
};

// ── Groq coaching ────────────────────────────────────────────────────────────

async function _groqCoaching(stats) {
  if (!GROQ_API_KEY) return _algorithmicCoaching(stats);

  const prompt = `You are an educational AI assistant helping a teacher improve their class. Based on this class analytics data, provide exactly 3 specific, actionable coaching insights. Return valid JSON only — no markdown, no explanation outside JSON: {"summary":"2 sentence class overview","insights":[{"icon":"BRAIN|TREND|TARGET|QUIZ|LESSON","type":"success|warning|suggestion","message":"specific actionable insight"}]}\n\nClass data: ${JSON.stringify(stats)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(GROQ_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body:    JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.55, max_tokens: 320 }),
      signal:  controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return _algorithmicCoaching(stats);

    const data  = await res.json();
    const text  = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return _algorithmicCoaching(stats);
    const parsed = JSON.parse(match[0]);
    if (!parsed.summary || !Array.isArray(parsed.insights)) return _algorithmicCoaching(stats);

    return { summary: parsed.summary, insights: parsed.insights.slice(0, 4), aiPowered: true, generatedAt: new Date().toISOString() };
  } catch {
    return _algorithmicCoaching(stats);
  }
}

function _algorithmicCoaching(stats) {
  const insights = [];
  const actRate = stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0;

  if (actRate >= 70) {
    insights.push({ icon: 'TREND', type: 'success',    message: `${actRate}% of students are active this week — excellent class momentum.` });
  } else if (actRate < 40) {
    insights.push({ icon: 'TREND', type: 'warning',    message: `Only ${actRate}% of students are active. Consider sending re-engagement nudges or shorter content.` });
  } else {
    insights.push({ icon: 'TREND', type: 'suggestion', message: `${actRate}% activity rate this week. Scheduled reminders or new content can push this above 70%.` });
  }

  if (stats.atRiskCount > 0) {
    insights.push({ icon: 'TARGET', type: 'warning', message: `${stats.atRiskCount} student${stats.atRiskCount > 1 ? 's are' : ' is'} at risk of falling behind. Early outreach has a measurable impact.` });
  }

  if (stats.avgCompletionRate < 40) {
    insights.push({ icon: 'LESSON', type: 'suggestion', message: `Avg lesson completion is ${stats.avgCompletionRate}%. Shorter video segments and clearer learning objectives improve completion.` });
  } else if (stats.avgCompletionRate >= 75) {
    insights.push({ icon: 'LESSON', type: 'success',    message: `${stats.avgCompletionRate}% average completion — students are engaging deeply with your content.` });
  } else {
    insights.push({ icon: 'LESSON', type: 'suggestion', message: `${stats.avgCompletionRate}% completion rate. Adding quizzes at lesson midpoints can help keep students on track.` });
  }

  if (stats.quizPassRate !== null && stats.quizPassRate < 60) {
    insights.push({ icon: 'QUIZ', type: 'warning',    message: `Quiz pass rate is ${stats.quizPassRate}%. Adding practice exercises before assessments can improve scores significantly.` });
  } else if (stats.quizPassRate !== null && stats.quizPassRate >= 80) {
    insights.push({ icon: 'QUIZ', type: 'success',    message: `${stats.quizPassRate}% quiz pass rate — students are mastering the assessments well.` });
  } else if (stats.quizPassRate !== null) {
    insights.push({ icon: 'QUIZ', type: 'suggestion', message: `${stats.quizPassRate}% pass rate. Reviewing common incorrect answers in flashcard decks can close knowledge gaps.` });
  } else {
    insights.push({ icon: 'BRAIN', type: 'suggestion', message: 'No quiz data yet. Adding quizzes gives you visibility into student comprehension and boosts retention.' });
  }

  const summary = [
    `${stats.activeStudents} of ${stats.totalStudents} students are active this week.`,
    stats.avgCompletionRate > 0 ? `Average lesson completion is ${stats.avgCompletionRate}%.` : 'No lesson completions recorded yet.',
  ].join(' ');

  return { summary, insights: insights.slice(0, 4), aiPowered: false, generatedAt: new Date().toISOString() };
}

// ── Empty state ──────────────────────────────────────────────────────────────

function _emptyResult(courses, subjects, totalStudents) {
  const coaching = _algorithmicCoaching({ totalStudents: 0, activeStudents: 0, avgCompletionRate: 0, atRiskCount: 0, quizPassRate: null });
  return {
    overview:           { totalStudents, activeStudents: 0, inactiveStudents: 0, avgXp: 0, avgLevel: 1, avgCompletionRate: 0, totalLessons: 0, totalSubjects: subjects.length, totalCourses: courses.length, quizPassRate: null },
    subjectPerformance: [],
    atRiskStudents:     [],
    topStudents:        [],
    activityFeed:       [],
    performanceTrend:   _emptyTrend(),
    aiCoaching:         coaching,
    generatedAt:        new Date().toISOString(),
  };
}

function _emptyTrend() {
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    trend.push({ date: new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10), completions: 0, quizPasses: 0 });
  }
  return trend;
}

// ── Main service ─────────────────────────────────────────────────────────────

export async function getInstructorAnalytics(teacherId) {
  const cached = _cache.get(teacherId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.data;

  // Step 1: Teacher's courses + subjects (2 parallel queries)
  const [teacherCourses, teacherSubjects] = await Promise.all([
    prisma.course.findMany({
      where:  { Teacher_id: teacherId },
      select: { id: true, Name: true },
    }),
    prisma.subject.findMany({
      where:  { Teacher_id: teacherId },
      select: { id: true, name: true, Course_id: true, lesson: { select: { id: true } } },
    }),
  ]);

  const courseIds  = [...new Set([...teacherCourses.map(c => c.id), ...teacherSubjects.map(s => s.Course_id)])];
  const subjectIds = teacherSubjects.map(s => s.id);
  const lessonIds  = teacherSubjects.flatMap(s => s.lesson.map(l => l.id));

  if (courseIds.length === 0) return _emptyResult(teacherCourses, teacherSubjects, 0);

  // Step 2: Enrolled students (academy + school)
  const [academyEnrollments, schoolStudents] = await Promise.all([
    prisma.enrollment.findMany({
      where:  { Course_id: { in: courseIds } },
      select: { user_Academy_id: true },
    }),
    prisma.student.findMany({
      where:  { Course_id: { in: courseIds } },
      select: { Student_id: true },
    }),
  ]);

  const studentIds = [...new Set([
    ...academyEnrollments.map(e => e.user_Academy_id),
    ...schoolStudents.map(s => s.Student_id),
  ])];

  if (studentIds.length === 0) return _emptyResult(teacherCourses, teacherSubjects, 0);
  if (lessonIds.length === 0)  return _emptyResult(teacherCourses, teacherSubjects, studentIds.length);

  const d7  = new Date(Date.now() - 7  * 86_400_000);
  const d30 = new Date(Date.now() - 30 * 86_400_000);

  // Step 3: Analytics queries (6 parallel)
  const [studentNames, xpSummaries, streakData, recentEvents, lessonProgressData, quizAttempts] = await Promise.all([
    prisma.user.findMany({
      where:  { id: { in: studentIds } },
      select: { id: true, name: true },
    }),
    prisma.student_xp_summary.findMany({
      where:  { studentId: { in: studentIds } },
      select: { studentId: true, totalXp: true, level: true },
    }),
    prisma.student_streak.findMany({
      where:  { studentId: { in: studentIds } },
      select: { studentId: true, currentStreak: true, lastActivityAt: true },
    }),
    prisma.xp_event.findMany({
      where:   { studentId: { in: studentIds }, createdAt: { gte: d7 } },
      orderBy: { createdAt: 'desc' },
      take:    200,
      select:  { studentId: true, eventType: true, createdAt: true },
    }),
    prisma.lesson_progress.findMany({
      where:  { studentId: { in: studentIds }, lessonId: { in: lessonIds }, isCompleted: true },
      select: { studentId: true, lessonId: true, updatedAt: true },
    }),
    prisma.quiz_attempt.findMany({
      where:   { studentId: { in: studentIds }, quiz: { lesson: { Subject_id: { in: subjectIds } } }, createdAt: { gte: d30 } },
      orderBy: { createdAt: 'desc' },
      take:    400,
      select:  { studentId: true, score: true, isPassed: true, createdAt: true },
    }),
  ]);

  // ── Compute ───────────────────────────────────────────────────────────────
  const nameMap   = new Map(studentNames.map(u => [u.id, u.name]));
  const xpMap     = new Map(xpSummaries.map(x => [x.studentId, x]));
  const streakMap = new Map(streakData.map(s => [s.studentId, s]));

  const activeSet        = new Set(recentEvents.map(e => e.studentId));
  const totalStudents    = studentIds.length;
  const activeStudents   = activeSet.size;
  const inactiveStudents = totalStudents - activeStudents;

  const avgXp    = xpSummaries.length > 0 ? Math.round(xpSummaries.reduce((s, x) => s + x.totalXp, 0) / xpSummaries.length) : 0;
  const avgLevel = xpSummaries.length > 0 ? Math.round(xpSummaries.reduce((s, x) => s + x.level, 0)  / xpSummaries.length) : 1;

  // Lesson completions per student
  const completedByStudent = new Map();
  for (const lp of lessonProgressData) {
    if (!completedByStudent.has(lp.studentId)) completedByStudent.set(lp.studentId, new Set());
    completedByStudent.get(lp.studentId).add(lp.lessonId);
  }

  const avgCompletionRate = lessonIds.length > 0 && totalStudents > 0
    ? Math.round(studentIds.reduce((sum, sid) => {
        return sum + ((completedByStudent.get(sid)?.size ?? 0) / lessonIds.length) * 100;
      }, 0) / totalStudents)
    : 0;

  // Quiz metrics
  const totalAttempts  = quizAttempts.length;
  const passedAttempts = quizAttempts.filter(a => a.isPassed).length;
  const quizPassRate   = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : null;

  // Subject performance
  const lessonToSubject = new Map();
  for (const subj of teacherSubjects) {
    for (const l of subj.lesson) lessonToSubject.set(l.id, subj.id);
  }

  const subjectCompletion = new Map(
    teacherSubjects.map(s => [s.id, { id: s.id, name: s.name, lessonCount: s.lesson.length, completedCount: 0 }])
  );
  for (const lp of lessonProgressData) {
    const sId = lessonToSubject.get(lp.lessonId);
    if (sId) subjectCompletion.get(sId).completedCount++;
  }

  const subjectPerformance = [...subjectCompletion.values()]
    .map(s => ({
      id:             s.id,
      name:           s.name,
      totalLessons:   s.lessonCount,
      completionRate: s.lessonCount > 0 && totalStudents > 0
        ? Math.round((s.completedCount / (s.lessonCount * totalStudents)) * 100)
        : 0,
      studentsCount:  totalStudents,
    }))
    .sort((a, b) => b.completionRate - a.completionRate);

  // At-risk students (inactive in last 7d)
  const atRiskStudents = studentIds
    .filter(sid => !activeSet.has(sid))
    .map(sid => {
      const completed    = completedByStudent.get(sid)?.size ?? 0;
      const completionRate = lessonIds.length > 0 ? Math.round((completed / lessonIds.length) * 100) : 0;
      const streak       = streakMap.get(sid);
      const lastActive   = streak?.lastActivityAt ? streak.lastActivityAt.toISOString().slice(0, 10) : null;
      const daysSince    = lastActive ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86_400_000) : 999;
      const reason       = completionRate < 10 ? 'Very low progress'
        : completionRate < 30 ? 'Below average progress'
        : daysSince > 14 ? `Inactive ${daysSince}d`
        : 'No activity this week';
      return { id: sid, name: nameMap.get(sid) || 'Student', completionRate, lastActive, daysSince: Math.min(daysSince, 999), streakDays: streak?.currentStreak ?? 0, reason };
    })
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 8);

  // Top students leaderboard
  const topStudents = [...xpMap.values()]
    .sort((a, b) => b.totalXp - a.totalXp)
    .slice(0, 10)
    .map((x, i) => ({
      rank: i + 1,
      id:               x.studentId,
      name:             nameMap.get(x.studentId) || 'Student',
      totalXp:          x.totalXp,
      level:            x.level,
      currentStreak:    streakMap.get(x.studentId)?.currentStreak ?? 0,
      completedLessons: completedByStudent.get(x.studentId)?.size ?? 0,
    }));

  // Activity feed (deduplicated per student per event per day)
  const activityFeed = recentEvents.slice(0, 25).map(e => ({
    studentId:   e.studentId,
    studentName: nameMap.get(e.studentId) || 'Student',
    eventType:   e.eventType,
    label:       EVENT_LABELS[e.eventType] || e.eventType,
    createdAt:   e.createdAt.toISOString(),
  }));

  // 7-day performance trend
  const performanceTrend = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    performanceTrend.push({
      date,
      completions: lessonProgressData.filter(lp => lp.updatedAt.toISOString().slice(0, 10) === date).length,
      quizPasses:  quizAttempts.filter(a => a.isPassed && a.createdAt.toISOString().slice(0, 10) === date).length,
    });
  }

  // AI coaching
  const classStats = { totalStudents, activeStudents, avgCompletionRate, avgXp, atRiskCount: atRiskStudents.length, quizPassRate, strongestSubject: subjectPerformance[0]?.name ?? null, weakestSubject: subjectPerformance[subjectPerformance.length - 1]?.name ?? null };
  const aiCoaching = await _groqCoaching(classStats);

  const result = {
    overview: { totalStudents, activeStudents, inactiveStudents, avgXp, avgLevel, avgCompletionRate, totalLessons: lessonIds.length, totalSubjects: teacherSubjects.length, totalCourses: teacherCourses.length, quizPassRate },
    subjectPerformance,
    atRiskStudents,
    topStudents,
    activityFeed,
    performanceTrend,
    aiCoaching,
    generatedAt: new Date().toISOString(),
  };

  _cache.set(teacherId, { data: result, cachedAt: Date.now() });
  return result;
}
