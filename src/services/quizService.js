import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { gatherLessonContent, callGroq } from './aiContentService.js';
import { dispatch, dispatchGamificationEvent, mergeRewards } from './gamificationDispatcher.js';

/* ─── Role resolution ─────────────────────────────────────────────────────── */

const resolveActor = async (actor) => {
  const role = String(actor?.role || '').toUpperCase();
  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: actor.id },
      select: { Teacher_id: true, OrgId: true },
    });
    if (!teacher) throw new AppError('Teacher profile not found', 404);
    return { role, orgId: teacher.OrgId, teacherId: teacher.Teacher_id, userId: actor.id };
  }
  if (role === 'ACADEMY' || role === 'SCHOOL') {
    return { role, orgId: actor.id, teacherId: null, userId: actor.id };
  }
  if (role === 'STUDENT') {
    return { role, orgId: null, teacherId: null, userId: actor.id };
  }
  throw new AppError('Access denied', 403);
};

const ensureTeacherOwnsLesson = async (scope, lessonId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: Number(lessonId) },
    include: { subject: { select: { Teacher_id: true, course: { select: { Org_id: true } } } } },
  });
  if (!lesson) throw new AppError('Lesson not found', 404);
  if (lesson.subject.course.Org_id !== scope.orgId) throw new AppError('Access denied', 403);
  if (scope.role === 'TEACHER' && lesson.subject.Teacher_id !== scope.teacherId) {
    throw new AppError('This lesson does not belong to your subjects', 403);
  }
  return lesson;
};

const ensureTeacherOwnsQuiz = async (scope, quizId) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: Number(quizId) },
    include: { lesson: { include: { subject: { select: { Teacher_id: true, course: { select: { Org_id: true } } } } } } },
  });
  if (!quiz) throw new AppError('Quiz not found', 404);
  if (quiz.lesson.subject.course.Org_id !== scope.orgId) throw new AppError('Access denied', 403);
  if (scope.role === 'TEACHER' && quiz.lesson.subject.Teacher_id !== scope.teacherId) {
    throw new AppError('This quiz does not belong to your subjects', 403);
  }
  return quiz;
};

/* ─── Quiz serializer ─────────────────────────────────────────────────────── */

const serializeQuiz = (quiz, { includeCorrectAnswers = false } = {}) => ({
  id: quiz.id,
  lessonId: quiz.lessonId,
  title: quiz.title,
  description: quiz.description,
  difficulty: quiz.difficulty,
  passingScore: quiz.passingScore,
  isPublished: quiz.isPublished,
  questionCount: quiz.questions?.length ?? 0,
  questions: (quiz.questions || []).map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    orderIndex: q.orderIndex,
    explanation: includeCorrectAnswers ? q.explanation : undefined,
    correctAnswer: includeCorrectAnswers ? q.correctAnswer : undefined,
  })),
  createdAt: quiz.createdAt,
  updatedAt: quiz.updatedAt,
});

const validLang = (lang) => (lang === 'en' ? 'en' : 'ar');

/* ─── Public API ──────────────────────────────────────────────────────────── */

export const getQuizForLesson = async (actor, lessonId, lang = 'ar') => {
  const scope = await resolveActor(actor);
  const isStudent = scope.role === 'STUDENT';
  const preferred = validLang(lang);

  // Fetch quiz with ALL questions (all languages) so we can apply smart fallback
  const quiz = await prisma.quiz.findUnique({
    where: { lessonId: Number(lessonId) },
    include: {
      questions: { orderBy: [{ lang: 'asc' }, { orderIndex: 'asc' }] },
      attempts: isStudent
        ? { where: { studentId: scope.userId }, orderBy: { createdAt: 'desc' }, take: 1 }
        : false,
    },
  });

  if (!quiz) return null;
  if (isStudent && !quiz.isPublished) return null;

  // Language resolution: prefer requested lang; if no questions exist in it,
  // fall back to whatever language the teacher generated — the quiz content
  // stays in its original language regardless of UI language.
  const allQuestions = quiz.questions || [];
  const preferredQs = allQuestions.filter((q) => q.lang === preferred);
  const fallbackLang = preferred === 'ar' ? 'en' : 'ar';
  const fallbackQs  = allQuestions.filter((q) => q.lang === fallbackLang);

  const resolvedQuestions = preferredQs.length > 0 ? preferredQs : fallbackQs;
  const resolvedLang      = preferredQs.length > 0 ? preferred : (fallbackQs.length > 0 ? fallbackLang : preferred);

  // For students: must have published quiz AND at least one language of questions
  if (isStudent && resolvedQuestions.length === 0) return null;

  const attempt = isStudent && quiz.attempts?.[0] ? {
    id: quiz.attempts[0].id,
    answers: quiz.attempts[0].answers,
    score: quiz.attempts[0].score,
    isPassed: quiz.attempts[0].isPassed,
    createdAt: quiz.attempts[0].createdAt,
  } : null;

  // Rebuild quiz object with only the resolved language's questions
  const quizWithResolvedQs = { ...quiz, questions: resolvedQuestions };

  return {
    ...serializeQuiz(quizWithResolvedQs, { includeCorrectAnswers: !isStudent || !!attempt }),
    lang: resolvedLang,
    attempt,
  };
};

export const createQuiz = async (actor, lessonId, { title, description, difficulty = 'MEDIUM', passingScore = 70 }) => {
  const scope = await resolveActor(actor);
  if (scope.role === 'STUDENT') throw new AppError('Students cannot create quizzes', 403);
  await ensureTeacherOwnsLesson(scope, lessonId);

  const existing = await prisma.quiz.findUnique({ where: { lessonId: Number(lessonId) } });
  if (existing) throw new AppError('A quiz already exists for this lesson', 409);

  const quiz = await prisma.quiz.create({
    data: { lessonId: Number(lessonId), title, description, difficulty, passingScore },
    include: { questions: true },
  });

  return serializeQuiz(quiz, { includeCorrectAnswers: true });
};

export const updateQuiz = async (actor, quizId, data) => {
  const scope = await resolveActor(actor);
  if (scope.role === 'STUDENT') throw new AppError('Students cannot update quizzes', 403);
  await ensureTeacherOwnsQuiz(scope, quizId);

  const allowed = ['title', 'description', 'difficulty', 'passingScore', 'isPublished'];
  const updateData = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  const quiz = await prisma.quiz.update({
    where: { id: Number(quizId) },
    data: updateData,
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });

  return serializeQuiz(quiz, { includeCorrectAnswers: true });
};

export const deleteQuiz = async (actor, quizId) => {
  const scope = await resolveActor(actor);
  if (scope.role === 'STUDENT') throw new AppError('Students cannot delete quizzes', 403);
  await ensureTeacherOwnsQuiz(scope, quizId);
  await prisma.quiz.delete({ where: { id: Number(quizId) } });
};

/* ─── AI Generation ───────────────────────────────────────────────────────── */

const SYS_AR = [
  'أنت مساعد تعليمي متخصص في صياغة أسئلة اختبار بجودة عالية باللغة العربية الفصحى.',
  'اكتب جميع النصوص بعربية فصحى سليمة خالية من الأخطاء الإملائية والنحوية.',
  'مسموح فقط بالحروف العربية والأرقام وعلامات الترقيم وكلمات إنجليزية تقنية راسخة مكتوبة بالأحرف اللاتينية.',
  'ممنوع منعاً باتاً استخدام أي حروف صينية أو يابانية أو كورية أو أي حروف غير عربية وغير لاتينية.',
  'ممنوع التعريب الصوتي مثل: وبجكت، كلاس، ميثود، ديزاين، فانكشن — استخدم المصطلح العربي الصحيح أو الكلمة الإنجليزية بالأحرف اللاتينية.',
  'أعد JSON صالح فقط بدون أي نص إضافي أو markdown.',
].join(' ');

const SYS_EN = [
  'You are an educational assistant specialized in creating high-quality quiz questions in clear, correct English.',
  'Use proper academic English with accurate spelling and grammar throughout.',
  'Every question, option, and explanation must be written entirely in English — no Arabic characters.',
  'Return valid JSON only, no markdown or extra text.',
].join(' ');

const buildQuizPrompt = (lessonTitle, content, { numQuestions, difficulty, notes, lang }) => {
  if (lang === 'en') {
    const diffGuide = {
      EASY:   'straightforward factual recall, direct definitions, and basic comprehension',
      MEDIUM: 'application of concepts, comparison between ideas, and cause-and-effect reasoning',
      HARD:   'deep analysis, synthesis of multiple concepts, evaluation, and edge cases',
    }[difficulty] || 'mixed difficulty';

    return `
⚠️ LANGUAGE RULE: Write ALL text in English only. No Arabic characters anywhere.

Generate exactly ${numQuestions} multiple-choice quiz questions.
Difficulty: ${difficulty} — ${diffGuide}
${notes ? `Topic focus: ${notes}` : ''}

Return valid JSON only in this exact format:
{
  "questions": [
    {
      "question": "Clear, grammatically correct question ending with a question mark?",
      "options": ["First option", "Second option", "Third option", "Fourth option"],
      "correctAnswer": 0,
      "explanation": "Concise explanation of why this answer is correct."
    }
  ]
}

Quality rules — follow strictly:
1. LANGUAGE: Every word must be in correct English. Proper spelling and grammar required.
2. QUESTIONS: Each question must be clear, unambiguous, and end with a question mark.
3. OPTIONS: Exactly 4 options. All options must be plausible and grammatically parallel to the question. No obviously wrong distractors.
4. CORRECT ANSWER: correctAnswer is 0-based index (0, 1, 2, or 3). Double-check it is truly correct.
5. EXPLANATION: One or two sentences explaining why the correct answer is right — not just repeating the option text.
6. NO REPETITION: Each question must test a different concept or sub-topic.
7. TECHNICAL TERMS: Use standard English technical vocabulary. Spell all terms correctly.

Lesson title: ${lessonTitle}
Content to base questions on:
${content}`.trim();
  }

  const diffGuideAr = {
    EASY:   'تذكر المعلومات والتعريفات المباشرة والفهم الأساسي',
    MEDIUM: 'تطبيق المفاهيم والمقارنة بين الأفكار وعلاقات السبب والنتيجة',
    HARD:   'التحليل العميق والتركيب بين المفاهيم المتعددة والحالات الاستثنائية',
  }[difficulty] || 'متنوع';

  return `
⚠️ قواعد اللغة الصارمة — يجب الالتزام بها:
- اكتب فقط بالحروف العربية والأرقام وعلامات الترقيم والكلمات اللاتينية التقنية.
- ممنوع أي حروف صينية أو يابانية أو كورية أو أي رموز غير عربية وغير لاتينية.
- ممنوع التعريب الصوتي: لا "وبجكت"، لا "كلاس"، لا "ميثود"، لا "ديزاين"، لا "فانكشن"، لا "اوبجيكت".
- استخدم المصطلحات الصحيحة: كائن (Object) | صنف أو فئة (Class) | دالة (Function) | وراثة (Inheritance) | تغليف (Encapsulation) | تجريد (Abstraction) | تصميم (Design) | برمجة كائنية (OOP)
- إذا لم يوجد مصطلح عربي راسخ، اكتب الكلمة الإنجليزية بالأحرف اللاتينية: مثال "Array" وليس "أريه".

أنشئ بالضبط ${numQuestions} سؤال اختيار من متعدد.
المستوى: ${difficulty} — ${diffGuideAr}
${notes ? `محور التركيز: ${notes}` : ''}

أعد JSON صالح فقط بهذا الشكل الدقيق:
{
  "questions": [
    {
      "question": "سؤال واضح ومحكم الصياغة ينتهي بعلامة استفهام؟",
      "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
      "correctAnswer": 0,
      "explanation": "شرح موجز لسبب صحة هذه الإجابة."
    }
  ]
}

قواعد الجودة:
1. الإملاء والنحو: الكتابة العربية صحيحة تماماً بدون أخطاء.
2. الأسئلة: واضحة لا لبس فيها وتنتهي بعلامة استفهام.
3. الخيارات: أربعة خيارات متوازية نحوياً ومعقولة جميعها.
4. الإجابة الصحيحة: correctAnswer رقم بين 0 و 3. تحقق من صحتها.
5. الشرح: جملة أو اثنتان توضح السبب ولا تكرر نص الخيار.
6. التنوع: كل سؤال يختبر جانباً مختلفاً.

عنوان الدرس: ${lessonTitle}
المحتوى:
${content}`.trim();
};

/* ─── Text sanitizer for Arabic output ───────────────────────────────────────
   Removes any CJK (Chinese/Japanese/Korean) and other non-Arabic / non-Latin
   Unicode blocks that the model sometimes hallucinates.
   Also replaces common phonetic transliterations with proper terms.          */
const TRANSLITERATIONS = [
  [/وبجكت|اوبجيكت|أوبجكت|أوبجيكت/g, 'كائن'],
  [/كلاس|كلآس/g, 'صنف'],
  [/ميثود/g, 'دالة'],
  [/ديزاين|ديزاين/g, 'تصميم'],
  [/فانكشن|فنكشن/g, 'دالة'],
  [/باراميتر/g, 'معامل'],
  [/ستراكشر|ستراكتشر/g, 'هيكل'],
  [/أريه|أري/g, 'Array'],
  [/لوب/g, 'حلقة'],
];

// Unicode ranges for CJK (Chinese/Japanese/Korean) and other non-Arabic/Latin scripts
const NON_AR_LATIN_PATTERN = /[⺀-⿿　-鿿ꀀ-꓿가-퟿豈-﫿︰-﹏]/g;

const sanitizeArabicText = (text) => {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  // Strip CJK and other foreign scripts
  out = out.replace(NON_AR_LATIN_PATTERN, '');
  // Fix transliterations
  for (const [pattern, replacement] of TRANSLITERATIONS) {
    out = out.replace(pattern, replacement);
  }
  // Collapse double spaces left by removals
  return out.replace(/\s{2,}/g, ' ').trim();
};

const sanitizeQuestion = (q, lang) => {
  if (lang !== 'ar') return q;
  return {
    ...q,
    question:    sanitizeArabicText(q.question),
    options:     (q.options || []).map(sanitizeArabicText),
    explanation: q.explanation ? sanitizeArabicText(q.explanation) : q.explanation,
  };
};

export const generateQuizQuestions = async (actor, quizId, { numQuestions = 10, difficulty = 'MEDIUM', notes = '', lang = 'ar' }) => {
  const scope = await resolveActor(actor);
  if (scope.role === 'STUDENT') throw new AppError('Students cannot generate quiz questions', 403);
  const quiz = await ensureTeacherOwnsQuiz(scope, quizId);
  const l = validLang(lang);

  const num = Math.min(Math.max(Number(numQuestions) || 10, 3), 20);
  const diff = ['EASY', 'MEDIUM', 'HARD'].includes(String(difficulty).toUpperCase())
    ? String(difficulty).toUpperCase()
    : 'MEDIUM';

  const { lesson, content } = await gatherLessonContent(quiz.lessonId);
  const prompt = buildQuizPrompt(lesson.name, content, { numQuestions: num, difficulty: diff, notes, lang: l });
  const systemPrompt = l === 'en' ? SYS_EN : SYS_AR;
  const raw = await callGroq(prompt, systemPrompt, 'llama-3.1-8b-instant');

  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new AppError('Invalid AI response — no JSON found', 502);
  const parsed = JSON.parse(match[0]);

  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
        .filter((q) => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctAnswer === 'number')
        .map((q, i) => {
          const base = {
            question: String(q.question).trim(),
            options: q.options.map((o) => String(o).trim()),
            correctAnswer: Math.min(Math.max(Math.round(q.correctAnswer), 0), 3),
            explanation: q.explanation ? String(q.explanation).trim() : null,
            orderIndex: i,
            lang: l,
          };
          return sanitizeQuestion(base, l);
        })
    : [];

  if (!questions.length) throw new AppError('AI did not return valid questions', 502);

  // Replace only the questions for this language — other language's questions are preserved
  await prisma.$transaction([
    prisma.quiz_question.deleteMany({ where: { quizId: Number(quizId), lang: l } }),
    prisma.quiz_question.createMany({
      data: questions.map((q) => ({ ...q, quizId: Number(quizId) })),
    }),
  ]);

  const updated = await prisma.quiz.findUnique({
    where: { id: Number(quizId) },
    include: { questions: { where: { lang: l }, orderBy: { orderIndex: 'asc' } } },
  });

  return { ...serializeQuiz(updated, { includeCorrectAnswers: true }), lang: l };
};

/* ─── Question CRUD ───────────────────────────────────────────────────────── */

export const addQuestion = async (actor, quizId, { question, options, correctAnswer, explanation, lang = 'ar' }) => {
  const scope = await resolveActor(actor);
  if (scope.role === 'STUDENT') throw new AppError('Students cannot add questions', 403);
  await ensureTeacherOwnsQuiz(scope, quizId);
  const l = validLang(lang);

  if (!question || !Array.isArray(options) || options.length !== 4 || typeof correctAnswer !== 'number') {
    throw new AppError('question, options (4 items), and correctAnswer (0-3) are required', 400);
  }

  const maxOrder = await prisma.quiz_question.aggregate({
    where: { quizId: Number(quizId), lang: l },
    _max: { orderIndex: true },
  });

  const q = await prisma.quiz_question.create({
    data: {
      quizId: Number(quizId),
      lang: l,
      question: String(question).trim(),
      options: options.map((o) => String(o).trim()),
      correctAnswer: Math.min(Math.max(Math.round(correctAnswer), 0), 3),
      explanation: explanation ? String(explanation).trim() : null,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  });

  return q;
};

export const deleteQuestion = async (actor, quizId, questionId) => {
  const scope = await resolveActor(actor);
  if (scope.role === 'STUDENT') throw new AppError('Students cannot delete questions', 403);
  await ensureTeacherOwnsQuiz(scope, quizId);

  const q = await prisma.quiz_question.findFirst({
    where: { id: Number(questionId), quizId: Number(quizId) },
  });
  if (!q) throw new AppError('Question not found', 404);

  await prisma.quiz_question.delete({ where: { id: Number(questionId) } });
};

/* ─── Student Attempt ─────────────────────────────────────────────────────── */

export const submitQuizAttempt = async (actor, lessonId, { answers, lang = 'ar' }) => {
  const scope = await resolveActor(actor);
  if (scope.role !== 'STUDENT') throw new AppError('Only students can submit quiz attempts', 403);
  const preferred = validLang(lang);

  const quiz = await prisma.quiz.findUnique({
    where: { lessonId: Number(lessonId) },
    include: { questions: { orderBy: [{ lang: 'asc' }, { orderIndex: 'asc' }] } },
  });
  if (!quiz || !quiz.isPublished) throw new AppError('Quiz not found or not published', 404);
  if (!Array.isArray(answers)) throw new AppError('answers must be an array', 400);

  // Same lang fallback as getQuizForLesson — score against the language that was shown
  const allQs = quiz.questions || [];
  const preferredQs = allQs.filter((q) => q.lang === preferred);
  const resolvedQs  = preferredQs.length > 0 ? preferredQs : allQs.filter((q) => q.lang === (preferred === 'ar' ? 'en' : 'ar'));
  const quizQuestions = resolvedQs;

  // Override quiz.questions with resolved set for scoring
  quiz.questions = quizQuestions;

  const correct = quiz.questions.filter((q, i) => answers[i] === q.correctAnswer).length;
  const score = quiz.questions.length > 0 ? Math.round((correct / quiz.questions.length) * 100) : 0;
  const isPassed = score >= quiz.passingScore;

  const attempt = await prisma.quiz_attempt.create({
    data: {
      quizId: quiz.id,
      studentId: scope.userId,
      answers,
      score,
      isPassed,
    },
  });

  let reward = null;
  if (isPassed) {
    reward = await dispatchGamificationEvent({ studentId: scope.userId, event: 'quiz.passed', sourceId: quiz.id });
    if (score === 100) {
      const perfectReward = await dispatchGamificationEvent({ studentId: scope.userId, event: 'quiz.perfect', sourceId: quiz.id });
      reward = mergeRewards(reward, perfectReward);
    }
  } else {
    // Failed attempts still count as engagement for streak
    dispatch({ studentId: scope.userId, event: 'quiz.attempted', sourceId: quiz.id });
  }

  // Return full quiz with answers revealed + attempt result + reward payload
  return {
    attempt: { id: attempt.id, answers, score, isPassed, createdAt: attempt.createdAt },
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      orderIndex: q.orderIndex,
    })),
    reward,
  };
};
