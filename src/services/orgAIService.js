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
const buildOrgContext = async (orgId, orgRole) => {
  const isSchool = String(orgRole || '').toUpperCase() === 'SCHOOL';

  const [
    org,
    tracks,
    teachers,
    studentsData,
    marksData,
    schoolSettings,
    revenueData,
  ] = await Promise.all([
    // 1. Org profile
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { Name: true, Role: true },
    }),

    // 2. Courses (tracks) with subjects (courses), enrollments, lesson counts
    prisma.track.findMany({
      where: { Org_id: orgId },
      select: {
        id: true,
        Name: true,
        GradeLevel: true,
        isPaid: true,
        price: true,
        teacher: { select: { user: { select: { name: true } } } },
        // ACADEMY: count enrollments
        enrollment: { select: { user_Academy_id: true } },
        // SCHOOL: count students enrolled in this course/grade
        student: { select: { Student_id: true } },
        // Subjects
        courses: {
          select: {
            id: true,
            name: true,
            isPaid: true,
            price: true,
            teacher: { select: { user: { select: { name: true } } } },
            lesson: { select: { id: true } },
            // ACADEMY: subject subscriptions (relation is named "subscriptions" in schema)
            subscriptions: { select: { id: true } },
          },
        },
        // Revenue (paid course payments)
        student_course_payment: {
          where: { status: 'PAID' },
          select: { amount: true },
        },
      },
    }),

    // 3. Teachers
    prisma.teacher.findMany({
      where: { OrgId: orgId },
      select: {
        Teacher_id: true,
        specialization: true,
        user: { select: { name: true } },
      },
    }),

    // 4. Students (SCHOOL: student table; ACADEMY: academy_user table)
    isSchool
      ? prisma.student.findMany({
          where: { OrgId: orgId },
          select: {
            Student_id: true,
            GradeLevel: true,
            AcademicStatus: true,
            user: { select: { name: true } },
          },
          take: 150,
          orderBy: { Student_id: 'asc' },
        })
      : prisma.academy_user.findMany({
          where: { OrgId: orgId },
          select: {
            user_academy_id: true,
            AcademicStatus: true,
            user: { select: { name: true } },
          },
          take: 150,
          orderBy: { user_academy_id: 'asc' },
        }),

    // 5. Marks (SCHOOL only)
    isSchool
      ? prisma.marks.findMany({
          where: { course: { track: { Org_id: orgId } } },
          select: {
            Numbers: true,
            OutOf: true,
            ExamPercentage: true,
            MarkType: true,
            student: {
              select: {
                GradeLevel: true,
                user: { select: { name: true } },
              },
            },
            course: {
              select: {
                id: true,
                name: true,
                track: { select: { Name: true, GradeLevel: true } },
              },
            },
          },
          take: 1000,
          orderBy: { id: 'desc' },
        })
      : Promise.resolve([]),

    // 6. School settings (pass threshold)
    isSchool
      ? prisma.organization_school_settings.findUnique({
          where: { OrgId: orgId },
          select: { passThresholdPercentage: true, minSubjectPassPercentage: true },
        })
      : Promise.resolve(null),

    // 7. Revenue data (ACADEMY: subject subscription payments)
    // Note: relation to subject is named "course" in student_subject_subscription model
    !isSchool
      ? prisma.student_subject_subscription.findMany({
          where: {
            course: { track: { Org_id: orgId } },
          },
          select: {
            amount: true,
            course: { select: { name: true } },
          },
          take: 500,
        })
      : Promise.resolve([]),
  ]);

  const passThreshold = Number(schoolSettings?.passThresholdPercentage || 50);

  // ── Build marks aggregation per subject (SCHOOL) ──
  const marksPerSubject = new Map();
  if (isSchool && Array.isArray(marksData)) {
    for (const mark of marksData) {
      const subjectName = mark.course?.name || 'Unknown';
      const courseName  = mark.course?.track?.Name || 'Unknown';
      const key         = `${courseName}|${subjectName}`;

      if (!marksPerSubject.has(key)) {
        marksPerSubject.set(key, {
          subjectName,
          courseName,
          gradeLevel: mark.course?.track?.GradeLevel ?? null,
          scores: [],
          failedStudents: [],
        });
      }

      const entry      = marksPerSubject.get(key);
      const rawPercent = mark.ExamPercentage != null
        ? Number(mark.ExamPercentage)
        : mark.OutOf > 0 ? (Number(mark.Numbers) / Number(mark.OutOf)) * 100 : null;

      if (rawPercent != null) {
        entry.scores.push(rawPercent);
        if (rawPercent < passThreshold) {
          const studentName = mark.student?.user?.name || 'Unknown';
          if (!entry.failedStudents.includes(studentName)) {
            entry.failedStudents.push(studentName);
          }
        }
      }
    }
  }

  // ── Aggregate courses context ──
  const coursesContext = (tracks || []).map((track) => {
    const enrolledCount = isSchool
      ? (track.student?.length ?? 0)
      : (track.enrollment?.length ?? 0);

    const courseRevenue = (track.student_course_payment || [])
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const subjects = (track.courses || []).map((subj) => {
      const subscriberCount = isSchool
        ? enrolledCount // school: subject subscriber = course enrolled students
        : (subj.subscriptions?.length ?? 0);

      const marksKey  = `${track.Name}|${subj.name}`;
      const marksInfo = marksPerSubject.get(marksKey);
      const avgScore  = marksInfo?.scores.length
        ? Number((marksInfo.scores.reduce((a, b) => a + b, 0) / marksInfo.scores.length).toFixed(1))
        : null;
      const passCount = marksInfo
        ? marksInfo.scores.filter((s) => s >= passThreshold).length
        : null;
      const failCount = marksInfo
        ? marksInfo.scores.filter((s) => s < passThreshold).length
        : null;

      return {
        name:            subj.name,
        teacherName:     subj.teacher?.user?.name || null,
        lessonCount:     subj.lesson?.length ?? 0,
        subscriberCount,
        ...(isSchool && marksInfo ? {
          marks: {
            passCount,
            failCount,
            passRate:       marksInfo.scores.length
              ? `${Math.round((passCount / marksInfo.scores.length) * 100)}%`
              : 'N/A',
            avgScore,
            failedStudents: marksInfo.failedStudents.slice(0, 30),
          },
        } : {}),
      };
    });

    return {
      name:            track.Name,
      gradeLevel:      track.GradeLevel ?? null,
      enrolledStudents: enrolledCount,
      teacherName:     track.teacher?.user?.name || null,
      isPaid:          Boolean(track.isPaid),
      price:           track.isPaid ? Number(track.price || 0) : 0,
      revenue:         courseRevenue,
      subjectCount:    subjects.length,
      subjects,
    };
  });

  // ── Revenue summary (ACADEMY) ──
  let revenueContext = null;
  if (!isSchool) {
    const totalCourseRevenue = coursesContext.reduce((sum, c) => sum + c.revenue, 0);
    const totalSubjectRevenue = Array.isArray(revenueData)
      ? revenueData.reduce((sum, r) => sum + Number(r.amount || 0), 0)
      : 0;

    const bySubject = new Map();
    if (Array.isArray(revenueData)) {
      for (const r of revenueData) {
        const key = r.course?.name || 'Unknown';
        bySubject.set(key, (bySubject.get(key) || 0) + Number(r.amount || 0));
      }
    }

    revenueContext = {
      totalFromCourses:  totalCourseRevenue,
      totalFromSubjects: totalSubjectRevenue,
      total:             totalCourseRevenue + totalSubjectRevenue,
      bySubject: Array.from(bySubject.entries())
        .map(([name, amount]) => ({ subjectName: name, revenue: amount }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  }

  // ── Students context ──
  const studentsContext = (studentsData || []).map((s) => ({
    name:   s.user?.name || 'Unknown',
    status: s.AcademicStatus || 'ACTIVE',
    ...(isSchool ? { grade: s.GradeLevel ?? null } : {}),
  }));

  // ── Final context ──
  const totalSubjects = coursesContext.reduce((sum, c) => sum + c.subjectCount, 0);

  return {
    organization: {
      name: org?.Name || 'Organization',
      type: isSchool ? 'SCHOOL' : 'ACADEMY',
    },
    summary: {
      totalTeachers: teachers.length,
      totalStudents: studentsData.length,
      totalCourses:  tracks.length,
      totalSubjects,
    },
    teachers: teachers.map((t) => ({
      name:           t.user?.name || 'Unknown',
      specialization: t.specialization || null,
    })),
    courses: coursesContext,
    students: studentsContext,
    ...(revenueContext ? { revenue: revenueContext } : {}),
    ...(isSchool ? { passThresholdPercentage: passThreshold } : {}),
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
export const askOrgAI = async ({ tokenUser, question, history = [] }) => {
  const orgId   = Number(tokenUser?.id   || 0);
  const orgRole = String(tokenUser?.role || '');

  if (!orgId) throw new AppError('Invalid organization account', 401);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AppError('GROQ_API_KEY is not configured', 500);

  const lang    = detectLang(question);
  const context = await buildOrgContext(orgId, orgRole);
  const orgName = context.organization.name;

  const systemPrompt = lang === 'en'
    ? [
        `You are an intelligent data assistant for the organization "${orgName}" (${context.organization.type}).`,
        `You have access to the organization's live data provided as a JSON context below.`,
        `Answer the admin's questions ONLY using the data in the context. Be concise, accurate, and helpful.`,
        `When listing items (e.g., failed students, top subjects), use a brief bulleted list.`,
        `If the answer cannot be determined from the context, say so honestly.`,
        `Do not add information beyond what is in the context.`,
      ].join(' ')
    : [
        `أنت مساعد بيانات ذكي للمنظمة "${orgName}" (${context.organization.type === 'SCHOOL' ? 'مدرسة' : 'أكاديمية'}).`,
        `لديك وصول إلى بيانات المنظمة الحية المقدمة كـ JSON أدناه.`,
        `أجب على أسئلة المدير فقط باستخدام البيانات الواردة في السياق. كن موجزًا ودقيقًا ومفيدًا.`,
        `عند سرد العناصر (مثل الطلاب الراسبين أو المواد الأعلى اشتراكًا)، استخدم قائمة نقطية مختصرة.`,
        `إذا تعذر تحديد الإجابة من السياق، قل ذلك بصدق.`,
        `لا تضف معلومات تتجاوز ما هو موجود في السياق.`,
      ].join(' ');

  const contextStr = JSON.stringify(context, null, 0);
  const userMessage = lang === 'en'
    ? `Organization data:\n${contextStr}\n\nAdmin question: ${question}`
    : `بيانات المنظمة:\n${contextStr}\n\nسؤال المدير: ${question}`;

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
