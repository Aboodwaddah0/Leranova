import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { resolveStudentContext } from './studentExperienceService.js';
import { dispatch, dispatchGamificationEvent } from './gamificationDispatcher.js';

const toUpper = (value) => String(value || '').trim().toUpperCase();
const PAID_SUBSCRIPTION_FILTER = {
  OR: [
    { paymentStatus: 'PAID' },
    { status: 'PAID' },
    { status: 'SUCCESS' },
  ],
};

const ensureStudentCanAccessLesson = async ({ studentId, lessonId }) => {
  const context = await resolveStudentContext(studentId);

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      course: {
        track: {
          Org_id: context.orgId,
        },
      },
    },
    select: {
      id: true,
      Subject_id: true,
      course: {
        select: {
          id: true,
          Course_id: true,
          isPaid: true,
          subscriptions: {
            where: {
              user_Academy_id: studentId,
              ...PAID_SUBSCRIPTION_FILTER,
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!lesson?.course) {
    throw new AppError('Lesson not found', 404);
  }

  if (context.mode === 'SCHOOL') {
    if (Number(lesson.course.Course_id) !== Number(context.classCourseId)) {
      throw new AppError('School student can only access class lessons', 403);
    }

    return lesson;
  }

  const subjectIsPaid = Boolean(lesson.course.isPaid);
  const hasPaidSubscription = lesson.course.subscriptions.length > 0;

  if (subjectIsPaid && !hasPaidSubscription) {
    throw new AppError('Subscription required for this material', 402);
  }

  return lesson;
};

export const upsertLessonProgress = async ({ studentId, lessonId, isCompleted }) => {
  await ensureStudentCanAccessLesson({ studentId, lessonId });

  const existing = await prisma.lesson_progress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
    select: { isCompleted: true },
  });
  const wasCompleted = existing?.isCompleted ?? false;

  const progress = await prisma.lesson_progress.upsert({
    where: {
      studentId_lessonId: {
        studentId,
        lessonId,
      },
    },
    update: {
      isCompleted: Boolean(isCompleted),
    },
    create: {
      studentId,
      lessonId,
      isCompleted: Boolean(isCompleted),
    },
  });

  let reward = null;
  if (isCompleted && !wasCompleted) {
    reward = await dispatchGamificationEvent({ studentId, event: 'lesson.completed', sourceId: lessonId });
  } else {
    // Any lesson interaction (even re-marking) touches the streak only
    dispatch({ studentId, event: 'lesson.viewed', sourceId: lessonId });
  }

  return {
    id: progress.id,
    studentId: progress.studentId,
    lessonId: progress.lessonId,
    isCompleted: Boolean(progress.isCompleted),
    updatedAt: progress.updatedAt,
    reward,
  };
};

export const getSubjectProgressSummary = async ({ studentId, subjectId }) => {
  const context = await resolveStudentContext(studentId);

  const subject = await prisma.course.findFirst({
    where: {
      id: subjectId,
      track: {
        Org_id: context.orgId,
      },
    },
    select: {
      id: true,
      Course_id: true,
      isPaid: true,
      subscriptions: {
        where: {
          user_Academy_id: studentId,
          ...PAID_SUBSCRIPTION_FILTER,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  if (context.mode === 'SCHOOL' && Number(subject.Course_id) !== Number(context.classCourseId)) {
    throw new AppError('School student can only access class subjects', 403);
  }

  if (context.mode === 'ACADEMY' && Boolean(subject.isPaid) && subject.subscriptions.length === 0) {
    throw new AppError('Subscription required for this material', 402);
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      Subject_id: subjectId,
    },
    select: {
      id: true,
      lesson_progress: {
        where: {
          studentId,
        },
        select: {
          isCompleted: true,
        },
        take: 1,
      },
    },
  });

  const total = lessons.length;
  const completed = lessons.filter((lesson) => lesson.lesson_progress[0]?.isCompleted).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    subjectId,
    totalLessons: total,
    completedLessons: completed,
    progressPercent: percent,
  };
};
