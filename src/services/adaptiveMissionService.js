import prisma from '../utils/prisma.js';
import { getStudentLearningProfile } from './learningProfileService.js';

// Full mission catalog with difficulty + tier metadata.
// All keys exist in gamificationService MISSIONS → progress tracked automatically.
const CATALOG = {
  DAILY: [
    { key: 'DAILY_CHATBOT_1',   label: 'AI Tutor Session',  description: 'Ask the AI chatbot today',        goal: 1, eventType: 'CHATBOT_SESSION',    xp: 8,  difficulty: 'BEGINNER', tier: 0 },
    { key: 'DAILY_FLASHCARD_1', label: 'Flashcard Review',  description: 'Study with flashcards today',     goal: 1, eventType: 'FLASHCARD_SESSION',  xp: 10, difficulty: 'BEGINNER', tier: 0 },
    { key: 'DAILY_LESSON_1',    label: 'Daily Lesson',      description: 'Complete 1 lesson today',          goal: 1, eventType: 'LESSON_COMPLETE',   xp: 10, difficulty: 'BEGINNER', tier: 0 },
    { key: 'DAILY_QUIZ_1',      label: 'Quiz Challenge',    description: 'Pass 1 quiz today',                goal: 1, eventType: 'QUIZ_PASS',         xp: 15, difficulty: 'MEDIUM',   tier: 1 },
    { key: 'DAILY_LESSON_3',    label: 'Triple Session',    description: 'Complete 3 lessons today',         goal: 3, eventType: 'LESSON_COMPLETE',   xp: 25, difficulty: 'HARD',     tier: 2 },
  ],
  WEEKLY: [
    { key: 'WEEKLY_LESSON_5',    label: 'Weekly Grind',     description: 'Complete 5 lessons this week',          goal: 5,  eventType: 'LESSON_COMPLETE',   xp: 40, difficulty: 'BEGINNER', tier: 0 },
    { key: 'WEEKLY_FLASHCARD_3', label: 'AI Study Week',    description: 'Use flashcards on 3 lessons this week', goal: 3,  eventType: 'FLASHCARD_SESSION', xp: 30, difficulty: 'MEDIUM',   tier: 1 },
    { key: 'WEEKLY_QUIZ_3',      label: 'Quiz Marathon',    description: 'Pass 3 quizzes this week',              goal: 3,  eventType: 'QUIZ_PASS',         xp: 50, difficulty: 'MEDIUM',   tier: 1 },
    { key: 'WEEKLY_LESSON_10',   label: 'Power Learner',    description: 'Complete 10 lessons this week',         goal: 10, eventType: 'LESSON_COMPLETE',   xp: 75, difficulty: 'HARD',     tier: 2 },
    { key: 'WEEKLY_PERFECT_2',   label: 'Perfectionist',    description: 'Score 100% on 2 quizzes this week',     goal: 2,  eventType: 'QUIZ_PERFECT',      xp: 60, difficulty: 'ELITE',    tier: 3 },
  ],
};

// Which mission keys to present per tier level.
const TIER_SELECTIONS = {
  DAILY: {
    0: ['DAILY_CHATBOT_1',   'DAILY_FLASHCARD_1', 'DAILY_LESSON_1'],
    1: ['DAILY_LESSON_1',    'DAILY_QUIZ_1',      'DAILY_FLASHCARD_1'],
    2: ['DAILY_LESSON_3',    'DAILY_QUIZ_1',      'DAILY_FLASHCARD_1'],
    3: ['DAILY_LESSON_3',    'DAILY_QUIZ_1',      'DAILY_CHATBOT_1'],
  },
  WEEKLY: {
    0: ['WEEKLY_LESSON_5',   'WEEKLY_FLASHCARD_3'],
    1: ['WEEKLY_LESSON_5',   'WEEKLY_QUIZ_3',     'WEEKLY_FLASHCARD_3'],
    2: ['WEEKLY_LESSON_10',  'WEEKLY_QUIZ_3',     'WEEKLY_FLASHCARD_3'],
    3: ['WEEKLY_LESSON_10',  'WEEKLY_QUIZ_3',     'WEEKLY_PERFECT_2'],
  },
};

const TIER_LABELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'];

function _weeklyStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function _computeTier(profile) {
  const score   = profile.engagementScore            ?? 0;
  const streak  = profile.consistency?.currentStreak ?? 0;
  const lessons = profile.learningVelocity?.lessonsThisWeek ?? 0;
  const avgQuiz = profile.quizPerformance?.avgScore   ?? 0;
  const attempts = profile.quizPerformance?.totalAttempts ?? 0;

  if (score >= 70 || (streak >= 7 && lessons >= 5))       return 3; // ELITE
  if (score >= 35 || (streak >= 3 && avgQuiz >= 70))       return 2; // ADVANCED
  if (score >= 15 || attempts >= 1)                        return 1; // INTERMEDIATE
  return 0;                                                           // BEGINNER
}

function _personalizeLabel(mission, profile) {
  const topSubject = profile.focusAreas?.[0]?.name;
  const streak     = profile.consistency?.currentStreak ?? 0;
  const aiTotal    = (profile.aiUsage?.flashcards ?? 0) + (profile.aiUsage?.chatbot ?? 0);

  let { label, description } = mission;

  if (topSubject && mission.eventType === 'LESSON_COMPLETE') {
    description = `${description} — stay in ${topSubject}`;
  }
  if (streak >= 5 && mission.eventType === 'LESSON_COMPLETE') {
    label = `${label} 🔥`;
  }
  if (aiTotal === 0 && mission.key === 'DAILY_CHATBOT_1') {
    description = 'Start your AI learning journey — ask anything';
  }
  if (aiTotal === 0 && mission.key === 'DAILY_FLASHCARD_1') {
    description = 'First-time flashcard session — unlock AI learning';
  }

  return { ...mission, label, description };
}

function _isRecommended(mission, profile, progressRow) {
  if (progressRow?.completed) return false;

  const aiTotal  = (profile.aiUsage?.flashcards ?? 0) + (profile.aiUsage?.chatbot ?? 0);
  const passRate = profile.quizPerformance?.passRate ?? 100;
  const streak   = profile.consistency?.currentStreak ?? 0;

  if (aiTotal === 0 && ['DAILY_CHATBOT_1', 'DAILY_FLASHCARD_1'].includes(mission.key)) return true;
  if (passRate < 65  && mission.eventType === 'QUIZ_PASS'         && !progressRow?.progress) return true;
  if (streak   === 0 && mission.eventType === 'LESSON_COMPLETE'   && !progressRow?.progress) return true;

  return false;
}

const _catalogMap = Object.fromEntries(
  [...CATALOG.DAILY, ...CATALOG.WEEKLY].map(m => [m.key, m])
);

export async function getAdaptiveMissions(studentId) {
  const dailyStart  = new Date(new Date().toISOString().slice(0, 10));
  const weeklyStart = _weeklyStart();

  const [profile, progressRows] = await Promise.all([
    getStudentLearningProfile(studentId),
    prisma.student_mission_progress.findMany({
      where: { studentId, periodStart: { in: [dailyStart, weeklyStart] } },
    }),
  ]);

  const tier       = _computeTier(profile);
  const progressMap = new Map(progressRows.map(r => [r.missionKey, r]));

  const buildList = (keys) => keys.map(key => {
    const base        = _catalogMap[key];
    const row         = progressMap.get(key);
    const personalized = _personalizeLabel(base, profile);
    return {
      ...personalized,
      progress:    row?.progress   ?? 0,
      completed:   row?.completed  ?? false,
      recommended: _isRecommended(base, profile, row),
    };
  });

  return {
    tier:            TIER_LABELS[tier],
    tierIndex:       tier,
    engagementScore: profile.engagementScore ?? 0,
    daily:           buildList(TIER_SELECTIONS.DAILY[tier]),
    weekly:          buildList(TIER_SELECTIONS.WEEKLY[tier]),
  };
}
