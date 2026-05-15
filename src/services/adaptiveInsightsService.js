import prisma from '../utils/prisma.js';
import { getStudentLearningProfile } from './learningProfileService.js';

export async function getAdaptiveInsights(studentId) {
  const [profile, quizAttempts, lessonProgressRows] = await Promise.all([
    getStudentLearningProfile(studentId),
    prisma.quiz_attempt.findMany({
      where: { studentId },
      select: {
        score: true,
        isPassed: true,
        quiz: {
          select: {
            lesson: {
              select: {
                id: true,
                name: true,
                Subject_id: true,
                subject: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.lesson_progress.findMany({
      where: { studentId },
      select: {
        lessonId: true,
        isCompleted: true,
        lesson: {
          select: {
            id: true,
            name: true,
            Subject_id: true,
            subject: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  // ── Per-subject quiz performance ─────────────────────────────────────────
  const subjectMap = new Map();
  for (const attempt of quizAttempts) {
    const subject = attempt.quiz?.lesson?.subject;
    if (!subject) continue;
    if (!subjectMap.has(subject.id)) {
      subjectMap.set(subject.id, { id: subject.id, name: subject.name, scores: [], passed: 0 });
    }
    const entry = subjectMap.get(subject.id);
    entry.scores.push(attempt.score);
    if (attempt.isPassed) entry.passed += 1;
  }

  const subjectPerformance = Array.from(subjectMap.values()).map((s) => ({
    subjectId: s.id,
    subjectName: s.name,
    attempts: s.scores.length,
    avgScore: s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0,
    passRate: s.scores.length > 0 ? Math.round((s.passed / s.scores.length) * 100) : 0,
  }));

  // Weak = ≥1 attempt and avg < 70%
  const weakSubjects = subjectPerformance
    .filter((s) => s.attempts > 0 && s.avgScore < 70)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3);

  // ── Next recommended lesson ───────────────────────────────────────────────
  // Find the subject the student is actively engaged in (has at least one
  // completed lesson) but still has uncompleted lessons.
  const completedSubjectIds = new Set(
    lessonProgressRows
      .filter((lp) => lp.isCompleted && lp.lesson?.Subject_id)
      .map((lp) => lp.lesson.Subject_id),
  );

  const uncompletedRows = lessonProgressRows.filter(
    (lp) => !lp.isCompleted && lp.lesson?.Subject_id && completedSubjectIds.has(lp.lesson.Subject_id),
  );

  let nextLesson = null;
  if (uncompletedRows.length > 0) {
    const row = uncompletedRows[0];
    nextLesson = {
      id: row.lesson.id,
      name: row.lesson.name,
      subjectName: row.lesson.subject?.name ?? '',
      subjectId: row.lesson.Subject_id,
    };
  }

  // ── Study suggestions ─────────────────────────────────────────────────────
  const suggestions = [];

  if (weakSubjects.length > 0) {
    const worst = weakSubjects[0];
    suggestions.push({
      type: 'WEAK_SUBJECT',
      text: `Your quiz avg in ${worst.subjectName} is ${worst.avgScore}% — revisit those lessons`,
      priority: 'HIGH',
    });
  }

  if (profile.learningVelocity?.trend === 'DECLINING') {
    suggestions.push({
      type: 'VELOCITY',
      text: 'Your lesson pace is slowing — complete one lesson today to rebuild momentum',
      priority: 'HIGH',
    });
  }

  if ((profile.aiUsage?.flashcards ?? 0) === 0 && (profile.aiUsage?.chatbot ?? 0) === 0) {
    suggestions.push({
      type: 'AI_TOOL',
      text: 'Try AI Flashcards on your next lesson to strengthen retention',
      priority: 'MEDIUM',
    });
  }

  if ((profile.consistency?.currentStreak ?? 0) === 0) {
    suggestions.push({
      type: 'STREAK',
      text: 'Start a new streak today — any lesson, quiz, or AI tool counts',
      priority: 'MEDIUM',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: 'MOMENTUM',
      text: "Great momentum — challenge yourself with a quiz to push your score higher",
      priority: 'LOW',
    });
  }

  // ── Momentum score (0–100) ─────────────────────────────────────────────────
  const velocityBonus = profile.learningVelocity?.trend === 'IMPROVING' ? 20
    : profile.learningVelocity?.trend === 'DECLINING' ? -20 : 0;

  const momentumScore = Math.max(0, Math.min(100, Math.round(
    (profile.engagementScore ?? 0) * 0.5
    + (profile.consistency?.consistencyScore ?? 0) * 0.35
    + velocityBonus,
  )));

  return {
    momentumScore,
    momentumTrend: profile.learningVelocity?.trend ?? 'STABLE',
    engagementLevel: profile.engagementLevel,
    weakSubjects,
    subjectPerformance,
    nextLesson,
    studySuggestions: suggestions.slice(0, 3),
  };
}
