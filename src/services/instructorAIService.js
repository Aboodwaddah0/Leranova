import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { groqFetchWithRetry } from '../utils/groqClient.js';

const GROQ_API_URL    = process.env.GROQ_API_URL    || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL      = process.env.GROQ_MODEL      || 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 30000);

// ── Language detection ────────────────────────────────────────────────────
const hasArabicChars = (text) => /[؀-ۿ]/u.test(String(text || ''));
const hasLatinChars  = (text) => /[A-Za-z]/u.test(String(text || ''));
const detectLang = (text) =>
  !hasArabicChars(text) && hasLatinChars(text) ? 'en' : 'ar';

// ── Context builder ───────────────────────────────────────────────────────
const buildInstructorContext = async (teacherId) => {
  // 1. Resolve teacher profile + OrgId + org type first (needed for conditional queries)
  const teacherProfile = await prisma.teacher.findUnique({
    where: { Teacher_id: teacherId },
    select: {
      OrgId: true,
      specialization: true,
      user: { select: { name: true } },
      organization: { select: { Role: true } },
    },
  });

  if (!teacherProfile) throw new AppError('Teacher profile not found', 404);

  const orgId    = teacherProfile.OrgId;
  const isSchool = String(teacherProfile.organization?.Role || '').toUpperCase() === 'SCHOOL';
  const teacherName = teacherProfile.user?.name || 'Teacher';

  // 2. All remaining queries in parallel
  const [
    tracks,
    subjects,
    marksData,
    schoolSettings,
    quizAttempts,
    lessonProgressData,
    studentsData,
  ] = await Promise.all([
    // Courses the teacher teaches
    prisma.track.findMany({
      where: { Teacher_id: teacherId },
      select: {
        id: true,
        Name: true,
        GradeLevel: true,
        enrollment: { select: { user_Academy_id: true } },
        student:    { select: { Student_id: true } },
      },
    }),

    // Subjects (courses) teacher teaches
    prisma.course.findMany({
      where: { Teacher_id: teacherId },
      select: {
        id: true,
        name: true,
        Course_id: true,
        lesson:        { select: { id: true } },
        subscriptions: { select: { id: true } },
        track: { select: { Name: true, GradeLevel: true } },
      },
    }),

    // Marks for teacher's subjects
    prisma.marks.findMany({
      where: { course: { Teacher_id: teacherId } },
      select: {
        Numbers:        true,
        OutOf:          true,
        ExamPercentage: true,
        MarkType:       true,
        student: {
          select: {
            GradeLevel: true,
            user: { select: { name: true } },
          },
        },
        course: { select: { id: true, name: true } },
      },
      take: 500,
      orderBy: { id: 'desc' },
    }),

    // School pass threshold
    isSchool
      ? prisma.organization_school_settings.findUnique({
          where: { OrgId: orgId },
          select: { passThresholdPercentage: true },
        })
      : Promise.resolve(null),

    // Quiz attempts for teacher's lessons
    prisma.quiz_attempt.findMany({
      where: {
        quiz: { lesson: { course: { Teacher_id: teacherId } } },
      },
      select: {
        isPassed: true,
        quiz: {
          select: {
            lesson: { select: { course: { select: { id: true, name: true } } } },
          },
        },
      },
      take: 300,
    }),

    // Lesson completions for teacher's subjects
    prisma.lesson_progress.findMany({
      where: {
        isCompleted: true,
        lesson: { course: { Teacher_id: teacherId } },
      },
      select: {
        lesson: { select: { Subject_id: true } },
      },
      take: 500,
    }),

    // Students in teacher's courses
    isSchool
      ? prisma.student.findMany({
          where: {
            Course_id: {
              in: await prisma.track.findMany({
                where: { Teacher_id: teacherId },
                select: { id: true },
              }).then((t) => t.map((x) => x.id)),
            },
          },
          select: {
            Student_id: true,
            GradeLevel: true,
            AcademicStatus: true,
            user: { select: { name: true } },
          },
          take: 150,
        })
      : prisma.academy_user.findMany({
          where: {
            enrollment: {
              some: {
                track: { Teacher_id: teacherId },
              },
            },
          },
          select: {
            user_academy_id: true,
            AcademicStatus: true,
            user: { select: { name: true } },
          },
          take: 150,
        }),
  ]);

  const passThreshold = Number(schoolSettings?.passThresholdPercentage || 50);

  // ── Aggregate marks per subject ──
  const marksPerSubject = new Map();
  for (const mark of marksData) {
    const subjectId   = mark.course?.id;
    const subjectName = mark.course?.name || 'Unknown';
    if (!subjectId) continue;

    if (!marksPerSubject.has(subjectId)) {
      marksPerSubject.set(subjectId, {
        subjectName,
        scores: [],
        failedStudents: [],
      });
    }

    const entry   = marksPerSubject.get(subjectId);
    const percent = mark.ExamPercentage != null
      ? Number(mark.ExamPercentage)
      : mark.OutOf > 0 ? (Number(mark.Numbers) / Number(mark.OutOf)) * 100 : null;

    if (percent != null) {
      entry.scores.push(percent);
      if (percent < passThreshold) {
        const name = mark.student?.user?.name || 'Unknown';
        if (!entry.failedStudents.includes(name)) entry.failedStudents.push(name);
      }
    }
  }

  // ── Aggregate quiz pass rate per subject ──
  const quizPerSubject = new Map();
  for (const attempt of quizAttempts) {
    const subjectId   = attempt.quiz?.lesson?.course?.id;
    const subjectName = attempt.quiz?.lesson?.course?.name || 'Unknown';
    if (!subjectId) continue;

    if (!quizPerSubject.has(subjectId)) quizPerSubject.set(subjectId, { pass: 0, total: 0, subjectName });
    const q = quizPerSubject.get(subjectId);
    q.total += 1;
    if (attempt.isPassed) q.pass += 1;
  }

  // ── Aggregate lesson completions per subject ──
  const completionsPerSubject = new Map();
  for (const lp of lessonProgressData) {
    const sid = lp.lesson?.Subject_id;
    if (!sid) continue;
    completionsPerSubject.set(sid, (completionsPerSubject.get(sid) || 0) + 1);
  }

  // ── Build subjects context ──
  const subjectsContext = subjects.map((subj) => {
    const marksInfo  = marksPerSubject.get(subj.id);
    const quizInfo   = quizPerSubject.get(subj.id);
    const completions = completionsPerSubject.get(subj.id) || 0;
    const lessonCount = subj.lesson?.length ?? 0;

    const passCount = marksInfo ? marksInfo.scores.filter((s) => s >= passThreshold).length : null;
    const failCount = marksInfo ? marksInfo.scores.filter((s) => s < passThreshold).length  : null;
    const avgScore  = marksInfo?.scores.length
      ? Number((marksInfo.scores.reduce((a, b) => a + b, 0) / marksInfo.scores.length).toFixed(1))
      : null;

    // Enrolled students for this subject (approx = course-level enrollment)
    const track = tracks.find((t) => t.id === subj.Course_id);
    const enrolledInCourse = isSchool
      ? (track?.student?.length ?? 0)
      : (track?.enrollment?.length ?? 0);

    const subscriberCount = isSchool
      ? enrolledInCourse
      : (subj.subscriptions?.length ?? 0);

    const completionRate = lessonCount > 0 && enrolledInCourse > 0
      ? `${Math.round((completions / (lessonCount * enrolledInCourse)) * 100)}%`
      : 'N/A';

    const quizPassRate = quizInfo?.total > 0
      ? `${Math.round((quizInfo.pass / quizInfo.total) * 100)}%`
      : 'N/A';

    return {
      name:            subj.name,
      courseName:      subj.track?.Name   || null,
      gradeLevel:      subj.track?.GradeLevel ?? null,
      lessonCount,
      subscriberCount,
      completionRate,
      quizPassRate,
      ...(marksInfo ? {
        marks: {
          passCount,
          failCount,
          passRate: marksInfo.scores.length
            ? `${Math.round((passCount / marksInfo.scores.length) * 100)}%`
            : 'N/A',
          avgScore,
          failedStudents: marksInfo.failedStudents.slice(0, 30),
        },
      } : {}),
    };
  });

  // ── Students list ──
  const studentsContext = (studentsData || []).map((s) => ({
    name:   s.user?.name || 'Unknown',
    status: s.AcademicStatus || 'ACTIVE',
    ...(isSchool ? { grade: s.GradeLevel ?? null } : {}),
  }));

  const totalStudents = isSchool
    ? tracks.reduce((sum, t) => sum + (t.student?.length ?? 0), 0)
    : tracks.reduce((sum, t) => sum + (t.enrollment?.length ?? 0), 0);

  return {
    teacher: {
      name:           teacherName,
      specialization: teacherProfile.specialization || null,
      orgType:        isSchool ? 'SCHOOL' : 'ACADEMY',
    },
    summary: {
      totalSubjects: subjects.length,
      totalCourses:  tracks.length,
      totalLessons:  subjects.reduce((sum, s) => sum + (s.lesson?.length ?? 0), 0),
      totalStudents,
    },
    subjects: subjectsContext,
    students: studentsContext,
    passThresholdPercentage: passThreshold,
  };
};

// ── History normalizer ────────────────────────────────────────────────────
const normalizeHistory = (history) =>
  (Array.isArray(history) ? history : [])
    .filter((e) => e && (e.role === 'user' || e.role === 'assistant'))
    .map((e) => ({ role: e.role, content: String(e.content || '').slice(0, 800) }))
    .filter((e) => e.content)
    .slice(-6);

// ── Main export ───────────────────────────────────────────────────────────
export const askInstructorAI = async ({ tokenUser, question, history = [] }) => {
  const teacherId = Number(tokenUser?.id || 0);
  if (!teacherId) throw new AppError('Invalid teacher account', 401);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AppError('GROQ_API_KEY is not configured', 500);

  const lang    = detectLang(question);
  const context = await buildInstructorContext(teacherId);
  const { name, orgType } = context.teacher;
  const isSchool = orgType === 'SCHOOL';

  const systemPrompt = lang === 'en'
    ? [
        `You are an intelligent data assistant for instructor "${name}" (${isSchool ? 'School' : 'Academy'}).`,
        `You have access to data about their subjects, students, marks, quiz results, and lesson completions.`,
        `Answer ONLY using the data provided in the JSON context. Be concise, accurate, and helpful.`,
        `When listing students or subjects, use a brief bulleted list.`,
        `If the answer cannot be determined from the context, say so honestly.`,
      ].join(' ')
    : [
        `أنت مساعد بيانات ذكي للمعلم "${name}" (${isSchool ? 'مدرسة' : 'أكاديمية'}).`,
        `لديك وصول إلى بيانات مواده ودروسه وطلابه ودرجاتهم ونتائج الاختبارات ومعدلات الإنجاز.`,
        `أجب فقط باستخدام البيانات الواردة في سياق JSON. كن موجزًا ودقيقًا ومفيدًا.`,
        `عند سرد الطلاب أو المواد، استخدم قائمة نقطية مختصرة.`,
        `إذا تعذر تحديد الإجابة من السياق، قل ذلك بصدق.`,
      ].join(' ');

  const contextStr  = JSON.stringify(context, null, 0);
  const userMessage = lang === 'en'
    ? `Instructor data:\n${contextStr}\n\nQuestion: ${question}`
    : `بيانات المعلم:\n${contextStr}\n\nالسؤال: ${question}`;

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  let response;
  try {
    response = await groqFetchWithRetry(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        temperature: 0.15,
        max_tokens:  800,
        messages: [
          { role: 'system', content: systemPrompt },
          ...normalizeHistory(history),
          { role: 'user', content: userMessage },
        ],
      }),
      signal: controller.signal,
    }, { retries: 2, baseDelay: 500 });
  } finally {
    clearTimeout(timer);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new AppError(body?.error?.message || 'AI request failed', 502);

  const answer = body?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new AppError('Empty response from AI', 502);

  return { answer, lang };
};
