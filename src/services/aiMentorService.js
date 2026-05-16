import { getStudentLearningProfile } from './learningProfileService.js';
import prisma from '../utils/prisma.js';

const GROQ_API_URL  = process.env.GROQ_API_URL  || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = process.env.GROQ_MODEL    || 'llama-3.3-70b-versatile';
const GROQ_API_KEY  = process.env.GROQ_API_KEY  || '';
const GROQ_TIMEOUT  = 8000;

// 30-minute cache — coaching signals change faster than the full profile
const _cache   = new Map(); // studentId → { mentor, cachedAt }
const CACHE_TTL = 30 * 60 * 1000;

function _weeklyStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function _computeSignals(profile, missionsCompleted) {
  const streak      = profile.consistency?.currentStreak      ?? 0;
  const activeDays  = profile.consistency?.activeDays30       ?? 0;
  const consistency = profile.consistency?.consistencyScore   ?? 0;
  const passRate    = profile.quizPerformance?.passRate        ?? 100;
  const attempts    = profile.quizPerformance?.totalAttempts   ?? 0;
  const aiFlash     = profile.aiUsage?.flashcards              ?? 0;
  const aiChat      = profile.aiUsage?.chatbot                 ?? 0;
  const aiMind      = profile.aiUsage?.mindmaps                ?? 0;
  const aiTotal     = aiFlash + aiChat + aiMind;
  const lessonsWeek = profile.learningVelocity?.lessonsThisWeek ?? 0;
  const trend       = profile.learningVelocity?.trend           ?? 'STABLE';
  const engScore    = profile.engagementScore                   ?? 0;

  const warnings  = [];
  const successes = [];
  const coaching  = [];

  // ── warnings (sorted by priority asc when used) ────────────────────────────
  if (streak === 0 && activeDays > 3) {
    warnings.push({ type: 'STREAK_BROKEN',   priority: 1,
      message: 'Your streak was broken. Every comeback counts — start one lesson today!' });
  }
  if (streak > 0 && streak < 3) {
    warnings.push({ type: 'STREAK_AT_RISK',  priority: 2,
      message: `Your ${streak}-day streak is fragile. Study something today to protect it.` });
  }
  if (attempts > 0 && passRate < 65) {
    warnings.push({ type: 'QUIZ_STRUGGLING', priority: 3,
      message: `Quiz pass rate is ${passRate}%. Review with flashcards before your next attempt.` });
  }
  if (activeDays < 3 && engScore < 20) {
    warnings.push({ type: 'INACTIVE',        priority: 4,
      message: "You've been quiet lately. Even a 10-minute lesson makes a real difference." });
  }

  // ── successes ───────────────────────────────────────────────────────────────
  if (streak >= 7) {
    successes.push({ type: 'STREAK_MASTER',
      message: `${streak}-day streak — you're building an unstoppable habit!` });
  }
  if (engScore >= 70) {
    successes.push({ type: 'ELITE_PERFORMER',
      message: "Elite-level engagement! You're in the top tier of learners." });
  }
  if (consistency >= 80) {
    successes.push({ type: 'CONSISTENCY_ACE',
      message: 'Exceptional consistency score. You keep showing up — that\'s the real secret.' });
  }
  if (missionsCompleted >= 3) {
    successes.push({ type: 'MISSION_HERO',
      message: `${missionsCompleted} missions completed this week — you're on a roll!` });
  }
  if (lessonsWeek >= 5 && trend === 'IMPROVING') {
    successes.push({ type: 'MOMENTUM',
      message: `${lessonsWeek} lessons this week with improving momentum. Keep it going!` });
  }

  // ── coaching points (informational, always shown) ──────────────────────────
  if (aiTotal === 0) {
    coaching.push({ icon: 'BRAIN',  type: 'suggestion',
      message: 'Try the AI chatbot or flashcards on your next lesson to boost retention by 40%.' });
  } else if (aiTotal < 3) {
    coaching.push({ icon: 'BRAIN',  type: 'suggestion',
      message: 'You\'ve started using AI tools. Use them every lesson for compounding results.' });
  }
  if (trend === 'DECLINING') {
    coaching.push({ icon: 'TREND',  type: 'warning',
      message: 'Lesson pace dropped this week. Try setting a 15-minute daily study block.' });
  }
  if (profile.focusAreas?.length > 0) {
    coaching.push({ icon: 'FOCUS',  type: 'success',
      message: `Strongest subject: ${profile.focusAreas[0].name}. Build on this advantage!` });
  }
  if (attempts >= 3 && passRate >= 80) {
    coaching.push({ icon: 'QUIZ',   type: 'success',
      message: `${passRate}% pass rate across ${attempts} quizzes — exam skills are sharp.` });
  }
  if (lessonsWeek === 0) {
    coaching.push({ icon: 'LESSON', type: 'warning',
      message: 'No lessons yet this week. Start with something short to warm up.' });
  }

  return { warnings, successes, coaching };
}

function _nextBestAction(profile, signals) {
  const streak   = profile.consistency?.currentStreak    ?? 0;
  const passRate = profile.quizPerformance?.passRate     ?? 100;
  const attempts = profile.quizPerformance?.totalAttempts ?? 0;
  const aiTotal  = (profile.aiUsage?.flashcards ?? 0) + (profile.aiUsage?.chatbot ?? 0);
  const lessons  = profile.learningVelocity?.lessonsThisWeek ?? 0;

  if (signals.warnings.some(w => w.type === 'STREAK_BROKEN')) {
    return { action: 'Complete one lesson today', reason: 'Rebuild your learning streak', urgency: 'HIGH', icon: 'FLAME' };
  }
  if (attempts > 0 && passRate < 65) {
    return { action: 'Review flashcards on your weakest subject', reason: `Push past the ${passRate}% pass rate`, urgency: 'HIGH', icon: 'QUIZ' };
  }
  if (streak > 0 && streak < 3) {
    return { action: 'Study today to protect your streak', reason: `Keep your ${streak}-day streak alive`, urgency: 'MEDIUM', icon: 'FLAME' };
  }
  if (aiTotal === 0) {
    return { action: 'Try the AI chatbot on your current lesson', reason: 'Unlock AI-powered learning', urgency: 'MEDIUM', icon: 'BRAIN' };
  }
  if (lessons === 0) {
    return { action: 'Complete your first lesson this week', reason: 'Kick off your weekly momentum', urgency: 'MEDIUM', icon: 'BOOK' };
  }
  return { action: 'Review your adaptive missions for today', reason: 'Stay on track with personalized goals', urgency: 'LOW', icon: 'TARGET' };
}

async function _groqNarrative(profile, signals, nextAction) {
  if (!GROQ_API_KEY) return null;

  const stats = {
    streak:          profile.consistency?.currentStreak ?? 0,
    engagementScore: profile.engagementScore ?? 0,
    passRate:        profile.quizPerformance?.passRate ?? null,
    lessonsThisWeek: profile.learningVelocity?.lessonsThisWeek ?? 0,
    trend:           profile.learningVelocity?.trend ?? 'STABLE',
    topSubject:      profile.focusAreas?.[0]?.name ?? null,
    warnings:        signals.warnings.map(w => w.type),
    successes:       signals.successes.map(s => s.type),
    nextAction:      nextAction.action,
  };

  const prompt = `You are an encouraging AI learning coach. Write a 2-sentence motivational coaching message for this student based on their data. Be specific, warm, and action-oriented. No markdown. Return JSON only: {"narrative": "..."}\n\nStudent data: ${JSON.stringify(stats)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT);

    const res = await fetch(GROQ_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body:    JSON.stringify({
        model:       GROQ_MODEL,
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens:  130,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data  = await res.json();
    const text  = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]).narrative || null;
  } catch {
    return null;
  }
}

function _algorithmicNarrative(profile, signals) {
  const streak   = profile.consistency?.currentStreak     ?? 0;
  const engScore = profile.engagementScore                 ?? 0;
  const lessons  = profile.learningVelocity?.lessonsThisWeek ?? 0;

  if (signals.warnings.some(w => w.type === 'STREAK_BROKEN')) {
    return 'Every expert was once a beginner who got back up. Start fresh today — one lesson is all it takes to turn things around.';
  }
  if (signals.successes.some(s => s.type === 'ELITE_PERFORMER')) {
    return `You're performing at an elite level with an engagement score of ${engScore}. Your consistency and dedication are setting you apart — keep raising the bar!`;
  }
  if (streak >= 3) {
    return `Your ${streak}-day streak shows real commitment. With ${lessons} lessons this week, you're building knowledge that compounds every day.`;
  }
  if (lessons >= 3) {
    return `${lessons} lessons in already — you're building solid momentum. Keep showing up and the results will follow.`;
  }
  return 'Learning is a journey, and consistency is the engine. Even small daily progress leads to big results over time — your next breakthrough is one lesson away.';
}

export async function getAIMentor(studentId) {
  const cached = _cache.get(studentId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.mentor;

  const [profile, missionsCompleted] = await Promise.all([
    getStudentLearningProfile(studentId),
    prisma.student_mission_progress.count({
      where: { studentId, completed: true, periodStart: { gte: _weeklyStart() } },
    }),
  ]);

  const signals    = _computeSignals(profile, missionsCompleted);
  const nextAction = _nextBestAction(profile, signals);

  const groqText   = await _groqNarrative(profile, signals, nextAction);
  const narrative  = groqText || _algorithmicNarrative(profile, signals);

  const mentor = {
    narrative,
    nextBestAction:   nextAction,
    coachingPoints:   signals.coaching.slice(0, 4),
    urgentWarning:    signals.warnings.sort((a, b) => a.priority - b.priority)[0] ?? null,
    successHighlight: signals.successes[0] ?? null,
    engagementScore:  profile.engagementScore ?? 0,
    streak:           profile.consistency?.currentStreak ?? 0,
    aiPowered:        Boolean(groqText),
    generatedAt:      new Date().toISOString(),
  };

  _cache.set(studentId, { mentor, cachedAt: Date.now() });
  return mentor;
}

export function invalidateAIMentorCache(studentId) {
  _cache.delete(studentId);
}
