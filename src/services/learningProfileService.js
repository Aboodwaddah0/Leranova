import prisma from '../utils/prisma.js';

const GROQ_API_URL    = process.env.GROQ_API_URL    || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL      = process.env.GROQ_MODEL      || 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 30000);
const CACHE_TTL_MS    = 60 * 60 * 1000; // 1 hour

const _cache = new Map(); // studentId → { profile, cachedAt }

function _getCached(studentId) {
  const entry = _cache.get(studentId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) { _cache.delete(studentId); return null; }
  return entry.profile;
}

function _setCache(studentId, profile) {
  _cache.set(studentId, { profile, cachedAt: Date.now() });
}

async function _aggregate(studentId) {
  const now = Date.now();
  const d30 = new Date(now - 30 * 86_400_000);

  const [events30, xpRow, streakRow, attempts, completedLessons, achievementCount] = await Promise.all([
    prisma.xp_event.findMany({
      where: { studentId, createdAt: { gte: d30 } },
      select: { eventType: true, createdAt: true },
    }),
    prisma.student_xp_summary.findUnique({ where: { studentId } }),
    prisma.student_streak.findUnique({ where: { studentId } }),
    prisma.quiz_attempt.findMany({
      where: { studentId },
      select: { score: true, isPassed: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.lesson_progress.findMany({
      where: { studentId, isCompleted: true },
      select: { lesson: { select: { course: { select: { name: true } } } } },
    }),
    prisma.student_achievement.count({ where: { studentId } }),
  ]);

  return { events30, xpRow, streakRow, attempts, completedLessons, achievementCount, now };
}

function _compute({ events30, xpRow, streakRow, attempts, completedLessons, achievementCount, now }) {
  // Active days in last 30d
  const activeDays30 = new Set(events30.map(e => e.createdAt.toISOString().slice(0, 10))).size;

  // Event counts + velocity
  const counts = {};
  let lessonsThisWeek = 0;
  let lessonsLastWeek = 0;
  for (const e of events30) {
    counts[e.eventType] = (counts[e.eventType] || 0) + 1;
    if (e.eventType === 'LESSON_COMPLETE') {
      const age = now - e.createdAt.getTime();
      if (age <= 7 * 86_400_000) lessonsThisWeek++;
      else if (age <= 14 * 86_400_000) lessonsLastWeek++;
    }
  }

  const velocityTrend = lessonsThisWeek > lessonsLastWeek ? 'IMPROVING'
    : lessonsThisWeek < lessonsLastWeek ? 'DECLINING' : 'STABLE';
  const xpPerActiveDay = activeDays30 > 0 ? Math.round((xpRow?.totalXp ?? 0) / activeDays30) : 0;

  // Consistency score 0-100
  const streakScore    = Math.min((streakRow?.currentStreak ?? 0) * 5, 50);
  const activityScore  = Math.min(activeDays30 * (50 / 20), 50);
  const consistencyScore = Math.round(streakScore + activityScore);

  // AI usage
  const flashcards = counts['FLASHCARD_SESSION'] ?? 0;
  const chatbot    = counts['CHATBOT_SESSION']   ?? 0;
  const mindmaps   = counts['MINDMAP_SESSION']   ?? 0;
  const preferredTool = flashcards >= chatbot && flashcards >= mindmaps ? 'FLASHCARDS'
    : chatbot >= mindmaps ? 'CHATBOT' : mindmaps > 0 ? 'MINDMAPS' : 'NONE';

  // Quiz performance
  const totalAttempts = attempts.length;
  const avgScore  = totalAttempts > 0
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts) : 0;
  const passRate  = totalAttempts > 0
    ? Math.round(attempts.filter(a => a.isPassed).length / totalAttempts * 100) : 0;
  const perfectCount = counts['QUIZ_PERFECT'] ?? 0;

  // Engagement level + score
  const engagementRaw = Math.min(
    (lessonsThisWeek * 10) + ((counts['QUIZ_PASS'] ?? 0) * 8) +
    (flashcards * 4) + (chatbot * 3) + Math.min((streakRow?.currentStreak ?? 0) * 2, 20),
    100
  );
  const engagementLevel = engagementRaw >= 80 ? 'VERY_HIGH'
    : engagementRaw >= 50 ? 'HIGH'
    : engagementRaw >= 20 ? 'MEDIUM' : 'LOW';

  // Focus areas (top 3 subjects by completed lesson count)
  const subjectCounts = {};
  for (const lp of completedLessons) {
    const name = lp.lesson?.course?.name;
    if (name) subjectCounts[name] = (subjectCounts[name] || 0) + 1;
  }
  const focusAreas = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));

  // Algorithmic strengths / weaknesses
  const strengths  = [];
  const weaknesses = [];

  if ((streakRow?.currentStreak ?? 0) >= 3) strengths.push('Consistent daily learner');
  if (avgScore >= 80)          strengths.push('Strong quiz performance');
  if (lessonsThisWeek >= 3)    strengths.push('High lesson completion rate this week');
  if (flashcards + chatbot + mindmaps >= 5) strengths.push('Active AI tool user');
  if (achievementCount >= 3)   strengths.push('Achievement-driven learner');
  if (perfectCount >= 1)       strengths.push('Perfectionist on quizzes');

  if ((streakRow?.currentStreak ?? 0) === 0) weaknesses.push('No active learning streak');
  if (avgScore > 0 && avgScore < 70)         weaknesses.push('Quiz scores need improvement');
  if (lessonsThisWeek === 0)                 weaknesses.push('No lessons completed this week');
  if (flashcards === 0 && chatbot === 0)     weaknesses.push('Not using AI learning tools');
  if (activeDays30 < 5)                      weaknesses.push('Low activity frequency');
  if (velocityTrend === 'DECLINING')         weaknesses.push('Learning pace is slowing down');

  if (strengths.length === 0)  strengths.push('Just getting started on the platform');
  if (weaknesses.length === 0) weaknesses.push('Maintain your current momentum');

  return {
    engagementLevel,
    engagementScore: engagementRaw,
    learningVelocity: { lessonsThisWeek, lessonsLastWeek, trend: velocityTrend, xpPerActiveDay },
    consistency: {
      currentStreak: streakRow?.currentStreak ?? 0,
      longestStreak: streakRow?.longestStreak ?? 0,
      activeDays30,
      consistencyScore,
    },
    aiUsage: { flashcards, chatbot, mindmaps, preferredTool },
    quizPerformance: { totalAttempts, avgScore, passRate, perfectCount },
    focusAreas,
    totalXp: xpRow?.totalXp ?? 0,
    level: xpRow?.level ?? 1,
    achievementsCount: achievementCount,
    strengths,
    weaknesses,
    summary: null,
  };
}

async function _groqNarrative(profile) {
  const prompt = `You are an educational AI analyst for Learnova LMS. Analyze this student's learning profile and return JSON only (no markdown, no explanation):

Student Data:
- Engagement: ${profile.engagementLevel} (score: ${profile.engagementScore}/100)
- Lessons this week: ${profile.learningVelocity.lessonsThisWeek}, trend: ${profile.learningVelocity.trend}
- Consistency score: ${profile.consistency.consistencyScore}/100, streak: ${profile.consistency.currentStreak} days, active ${profile.consistency.activeDays30} days in last 30
- Quiz avg: ${profile.quizPerformance.avgScore}%, pass rate: ${profile.quizPerformance.passRate}%, total attempts: ${profile.quizPerformance.totalAttempts}
- Flashcard sessions: ${profile.aiUsage.flashcards}, chatbot: ${profile.aiUsage.chatbot}, mindmaps: ${profile.aiUsage.mindmaps}, preferred: ${profile.aiUsage.preferredTool}
- Focus subjects: ${profile.focusAreas.map(f => f.name).join(', ') || 'none yet'}
- Level: ${profile.level}, XP: ${profile.totalXp}, achievements: ${profile.achievementsCount}

Return this exact JSON structure with concise, specific, data-driven content:
{
  "strengths": ["2-4 specific strength statements based on the numbers above"],
  "weaknesses": ["1-3 specific improvement areas based on the numbers above"],
  "summary": "2 sentences max: describe this student's learning style and the single most important thing they should focus on next"
}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content?.trim() || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON');
    return JSON.parse(match[0]);
  } catch {
    clearTimeout(timer);
    throw new Error('Groq unavailable');
  }
}

export async function getStudentLearningProfile(studentId) {
  const cached = _getCached(studentId);
  if (cached) return cached;

  const raw     = await _aggregate(studentId);
  const profile = _compute(raw);

  try {
    const narrative = await _groqNarrative(profile);
    if (Array.isArray(narrative.strengths)  && narrative.strengths.length)  profile.strengths = narrative.strengths;
    if (Array.isArray(narrative.weaknesses) && narrative.weaknesses.length) profile.weaknesses = narrative.weaknesses;
    if (typeof narrative.summary === 'string' && narrative.summary)          profile.summary = narrative.summary;
  } catch {
    // algorithmic profile is returned as-is
  }

  profile.generatedAt = new Date().toISOString();
  _setCache(studentId, profile);
  return profile;
}

export function invalidateLearningProfileCache(studentId) {
  _cache.delete(studentId);
}
