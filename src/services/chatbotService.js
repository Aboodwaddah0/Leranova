import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const RAG_QUERY_TIMEOUT_MS = Number(process.env.RAG_QUERY_TIMEOUT_MS || 10000);
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://rag-service:8000';
const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SCOPE_THRESHOLDS = {
  lesson: 0.65,
  subject: 0.72,
  course: 0.78,
};

const MAX_CONTEXT_CHUNKS = 5;
const MIN_CONTEXT_CHUNKS = 1;
const ALLOWED_SOURCE_TYPES = new Set(['video', 'pdf', 'docx', 'txt']);
const ORG_ROLES = new Set(['ACADEMY', 'SCHOOL']);

const REFUSAL_ANSWER = 'هذا غير مغطى بشكل واضح في محتوى هذه الحصة.';

const CHATBOT_SYSTEM_PROMPT = [
  'أنت مساعد أكاديمي صارم في Learnova.',
  'استخدم فقط السياق المزوَّد من مواد الدرس.',
  'ممنوع استخدام أي معرفة خارجية أو افتراضات غير مدعومة.',
  `إذا لم يكن الدعم كافيًا فارجع النص حرفيًا: "${REFUSAL_ANSWER}".`,
  'لا تدمج مقاطع غير مرتبطة في ادعاء واحد.',
  'إذا كان الدعم جزئيًا صرّح بذلك بوضوح دون اختلاق.',
  'قدّم جوابًا عربيًا واضحًا ومباشرًا للطالب: دقيق، مختصر، غير مكرر.',
  'للأسئلة التحليلية: خلاصة قوية ثم شرح منظم قصير.',
  'للأسئلة المباشرة: جواب مباشر موجز.',
  'للملخص: نقاط مركزة غير مكررة.',
  'تجنب الحشو والمبالغة والعبارات العامة غير المفيدة.',
  'أعط المعنى المقصود في الدرس لا تفسيرًا عامًا بعيدًا.',
].join(' ');

const parseJsonResponse = async (response) => {
  const text = await response.text().catch(() => '');
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw: text };
  }
};

const normalizeChunk = (chunk, fallbackLessonId = null) => {
  if (!chunk) return null;

  const lessonId = Number(
    chunk.lesson_id
    ?? chunk.lessonId
    ?? chunk.metadata?.lesson_id
    ?? chunk.metadata?.lessonId
    ?? fallbackLessonId
  );
  const score = Number(chunk.score ?? chunk.similarity ?? chunk.relevance ?? 0);

  return {
    text: String(chunk.text ?? chunk.chunk_text ?? chunk.chunkText ?? ''),
    lesson_id: Number.isFinite(lessonId) ? lessonId : null,
    subject_id: Number(
      chunk.subject_id
      ?? chunk.subjectId
      ?? chunk.metadata?.subject_id
      ?? chunk.metadata?.subjectId
      ?? 0
    ) || null,
    source_type: String(
      chunk.source_type
      ?? chunk.sourceType
      ?? chunk.metadata?.source_type
      ?? ''
    ).toLowerCase() || null,
    source_name: chunk.source_name ?? chunk.sourceName ?? chunk.metadata?.source_name ?? null,
    page: chunk.page ?? chunk.metadata?.page ?? null,
    timestamp: chunk.timestamp ?? chunk.metadata?.timestamp ?? null,
    chunk_index: chunk.chunk_index ?? chunk.chunkIndex ?? chunk.metadata?.chunk_index ?? null,
    organization_id: Number(
      chunk.organization_id
      ?? chunk.organizationId
      ?? chunk.metadata?.organization_id
      ?? chunk.metadata?.organizationId
      ?? 0
    ) || null,
    score: Number.isFinite(score) ? score : 0,
  };
};

const normalizeArabicText = (text) => String(text || '')
  .replace(/[\u0640]/g, '')
  .replace(/[\u200f\u200e]/g, '')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[٫]/g, '.')
  .replace(/[،]{2,}/g, '،')
  .replace(/[.]{2,}/g, '.')
  .replace(/[\s\t\r\n]+/g, ' ')
  .trim();

const isCorruptedFragment = (text) => {
  if (!text) return true;
  if (text.length < 25) return true;

  const weirdRatio = (text.match(/[^\p{L}\p{N}\s.,;:!?()\-_[\]"'،]/gu) || []).length / text.length;
  if (weirdRatio > 0.15) return true;

  const repeatedChar = /(.)\1{6,}/u.test(text);
  return repeatedChar;
};

const cleanChunkText = (text) => {
  const cleaned = normalizeArabicText(text)
    .replace(/\b(ocr|scan|page)\b[:\-]?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
};

const toTokenSet = (text) => {
  const normalized = normalizeArabicText(text).toLowerCase();
  const tokens = normalized.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 2);
  return new Set(tokens);
};

const QUESTION_STOP_TOKENS = new Set([
  'ما', 'ماذا', 'كيف', 'لماذا', 'هل', 'من', 'متى', 'اين', 'أين', 'كم',
  'اشرح', 'فسر', 'وضح', 'حلل', 'لخص', 'ملخص', 'نقاط', 'قصيرة', 'بإيجاز',
  'حصة', 'الحصة', 'درس', 'الدرس', 'هذه', 'هذا', 'ذلك', 'تلك',
  'في', 'على', 'من', 'إلى', 'الى', 'عن', 'مع', 'بين', 'ثم', 'او', 'أو', 'كما',
  'هو', 'هي', 'كان', 'كانت', 'يكون', 'تكون',
]);

const jaccardSimilarity = (a, b) => {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
};

const detectQuestionStyle = (question) => {
  const q = normalizeArabicText(question).toLowerCase();
  if (/لخص|summarize|summary|ملخص/.test(q)) return 'summary';
  if (/حلل|فسر|وضح|لماذا|كيف|compare|analy/.test(q)) return 'analytical';
  return 'factual';
};

const resolveRequesterContext = async (tokenUser) => {
  const role = String(tokenUser?.role || '').toUpperCase();
  const userId = Number(tokenUser?.id || 0);

  if (!userId) throw new AppError('Invalid authenticated user', 401);

  if (ORG_ROLES.has(role)) {
    return {
      role,
      userId,
      orgId: Number(tokenUser?.orgId || userId),
    };
  }

  const academyUser = await prisma.academy_user.findUnique({
    where: { user_academy_id: userId },
    select: { OrgId: true },
  });

  if (!academyUser?.OrgId) {
    throw new AppError('Authenticated user is not linked to an organization', 403);
  }

  return {
    role,
    userId,
    orgId: academyUser.OrgId,
  };
};

const getCourseContext = async ({ orgId, courseId, subjectId, lessonId }) => {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      Org_id: orgId,
    },
    include: {
      subject: {
        include: {
          lesson: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!course) throw new AppError('course_id not found for this organization', 404);

  const subjects = course.subject;
  if (!subjects.length) throw new AppError('No subjects found in this course', 404);

  const lessonToSubject = new Map();
  const subjectToLessons = new Map();

  for (const subject of subjects) {
    const lessonIds = subject.lesson.map((lesson) => lesson.id);
    subjectToLessons.set(subject.id, lessonIds);
    for (const lessonIdInSubject of lessonIds) {
      lessonToSubject.set(lessonIdInSubject, subject.id);
    }
  }

  if (!lessonToSubject.size) throw new AppError('No lessons found in this course', 404);

  let resolvedSubjectId = subjectId ?? null;
  if (resolvedSubjectId && !subjectToLessons.has(resolvedSubjectId)) {
    throw new AppError('subject_id does not belong to course_id', 404);
  }

  if (lessonId) {
    const lessonSubject = lessonToSubject.get(lessonId);
    if (!lessonSubject) throw new AppError('lesson_id does not belong to course_id', 404);
    if (resolvedSubjectId && resolvedSubjectId !== lessonSubject) {
      throw new AppError('lesson_id does not belong to subject_id', 404);
    }
    resolvedSubjectId = lessonSubject;
  }

  return {
    courseLessonIds: Array.from(lessonToSubject.keys()),
    subjectLessonIds: resolvedSubjectId ? (subjectToLessons.get(resolvedSubjectId) || []) : [],
    resolvedSubjectId,
    lessonToSubject,
  };
};

const queryRagDirect = async ({ question, courseId, subjectId, lessonId, organizationId, limit = 10 }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RAG_QUERY_TIMEOUT_MS);

  try {
    const response = await fetch(`${RAG_SERVICE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        course_id: courseId,
        subject_id: subjectId ?? null,
        lesson_id: lessonId ?? null,
        organization_id: organizationId,
        source_types: Array.from(ALLOWED_SOURCE_TYPES),
        limit,
      }),
      signal: controller.signal,
    });

    const body = await parseJsonResponse(response);
    if (!response.ok) return [];

    const chunks = body?.chunks ?? body?.matches ?? body?.data?.chunks ?? body?.data?.matches ?? [];
    if (!Array.isArray(chunks)) return [];

    return chunks.map((chunk) => normalizeChunk(chunk)).filter(Boolean);
  } catch (_error) {
    return [];
  } finally {
    clearTimeout(timeout);
  }
};

const queryRagFallbackRetrieve = async ({ question, lessonIds }) => {
  const limitedLessonIds = lessonIds.slice(0, 30);
  const calls = limitedLessonIds.map(async (id) => {
    const response = await fetch(`${RAG_SERVICE_URL}/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: question,
        lessonId: String(id),
        limit: 5,
      }),
    });

    if (!response.ok) return [];

    const body = await parseJsonResponse(response);
    const matches = body?.matches ?? [];
    if (!Array.isArray(matches)) return [];

    return matches.map((chunk) => normalizeChunk(chunk, id)).filter(Boolean);
  });

  const settled = await Promise.allSettled(calls);
  return settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);
};

const enrichSubjectIds = (chunks, lessonToSubject) => chunks.map((chunk) => ({
  ...chunk,
  subject_id: chunk.subject_id || lessonToSubject.get(chunk.lesson_id) || null,
}));

const dedupeAndSortChunks = (chunks, question) => {
  const questionTokens = toTokenSet(question);
  const deduped = new Map();
  const selected = [];

  for (const chunk of chunks) {
    if (!chunk?.text || !chunk.lesson_id || !chunk.source_type) continue;
    if (!ALLOWED_SOURCE_TYPES.has(chunk.source_type)) continue;

    const cleanedText = cleanChunkText(chunk.text);
    if (isCorruptedFragment(cleanedText)) continue;

    const chunkTokens = toTokenSet(cleanedText);
    const overlap = jaccardSimilarity(questionTokens, chunkTokens);
    if (questionTokens.size && overlap < 0.01 && Number(chunk.score || 0) < 0.8) continue;

    const key = `${chunk.lesson_id}|${chunk.source_type}|${chunk.chunk_index ?? 'na'}|${cleanedText}`;
    const existing = deduped.get(key);
    if (!existing || chunk.score > existing.score) {
      deduped.set(key, {
        ...chunk,
        text: cleanedText,
      });
    }
  }

  const sorted = Array.from(deduped.values()).sort((a, b) => b.score - a.score);

  for (const chunk of sorted) {
    const tokens = toTokenSet(chunk.text);
    const isNearDuplicate = selected.some((existing) => {
      const sim = jaccardSimilarity(tokens, toTokenSet(existing.text));
      return sim >= 0.86;
    });

    if (!isNearDuplicate) selected.push(chunk);
    if (selected.length >= MAX_CONTEXT_CHUNKS * 2) break;
  }

  return selected;
};

const keepCohesiveChunks = (chunks, scope) => {
  if (!chunks.length) return [];

  if (scope === 'lesson') {
    const lessonId = chunks[0].lesson_id;
    return chunks.filter((chunk) => chunk.lesson_id === lessonId);
  }

  const topSubject = chunks[0].subject_id;
  if (!topSubject) return chunks;

  if (scope === 'subject' || scope === 'course') {
    return chunks.filter((chunk) => chunk.subject_id === topSubject);
  }

  return chunks;
};

const calculateConfidence = (chunks) => {
  if (!chunks.length) return 0;
  const top = chunks.slice(0, 3);
  const average = top.reduce((sum, chunk) => sum + (Number(chunk.score) || 0), 0) / top.length;
  return Number(Math.max(0, Math.min(1, average)).toFixed(3));
};

const calculateTopScore = (chunks) => Number((chunks[0]?.score || 0).toFixed(3));

const hasMultiSourceSupport = (chunks) => new Set(chunks.map((chunk) => chunk.source_type)).size >= 2;

const buildReferences = (chunks) => chunks.map((chunk) => ({
  source_type: chunk.source_type,
  source_name: chunk.source_name,
  page: chunk.page,
  timestamp: chunk.timestamp,
  lesson_id: chunk.lesson_id,
  subject_id: chunk.subject_id,
  score: Number((chunk.score || 0).toFixed(3)),
}));

const makeRefusal = ({ scope, fallback, reason }) => ({
  answer: REFUSAL_ANSWER,
  explanation: reason || 'لا تتوفر أدلة كافية وموثوقة داخل مواد الدرس للإجابة بدقة.',
  references: [],
  confidence: 0,
  scope,
  fallback,
});

const isVagueQuestion = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;

  const tokenCount = normalized.split(/\s+/).filter(Boolean).length;
  if (tokenCount < 3) return true;

  const vaguePatterns = [
    /^tell me anything[.!?]*$/,
    /^anything[.!?]*$/,
    /^help me[.!?]*$/,
    /^explain[.!?]*$/,
    /^what\??[.!?]*$/,
    /^احكي اي شيء[.!؟]*$/,
    /^اي شيء[.!؟]*$/,
    /^اشرح[.!؟]*$/,
    /^ممكن توضيح[.!؟]*$/,
  ];

  return vaguePatterns.some((pattern) => pattern.test(normalized));
};

const isStrongEnough = ({ chunks, scope }) => {
  if (chunks.length < MIN_CONTEXT_CHUNKS) return false;

  const threshold = SCOPE_THRESHOLDS[scope] || SCOPE_THRESHOLDS.course;
  const topScore = calculateTopScore(chunks);
  const confidence = calculateConfidence(chunks);
  const topTwoAvg = chunks.slice(0, 2).reduce((sum, chunk) => sum + Number(chunk.score || 0), 0) / Math.min(2, chunks.length);

  if (topScore < threshold) return false;
  if (confidence < threshold) return false;
  if (topTwoAvg < (threshold - 0.05)) return false;

  return true;
};

const hasTopicalSupport = (question, chunks) => {
  const questionTokens = toTokenSet(question);
  if (questionTokens.size < 2) return true;

  const contentTokens = new Set(
    Array.from(questionTokens).filter((token) => !QUESTION_STOP_TOKENS.has(token))
  );

  if (!contentTokens.size) {
    return true;
  }

  let maxOverlap = 0;
  let maxSharedCount = 0;

  for (const chunk of chunks) {
    const chunkTokens = toTokenSet(chunk.text);
    if (!chunkTokens.size) continue;

    let shared = 0;
    for (const token of contentTokens) {
      if (chunkTokens.has(token)) shared += 1;
    }

    const overlap = contentTokens.size ? (shared / contentTokens.size) : 0;
    maxOverlap = Math.max(maxOverlap, overlap);
    maxSharedCount = Math.max(maxSharedCount, shared);
  }

  if (maxSharedCount === 0) return false;
  if (maxOverlap < 0.08) return false;
  return true;
};

const selectStageChunks = async ({
  question,
  scope,
  courseId,
  subjectId,
  lessonId,
  organizationId,
  candidateLessonIds,
  lessonToSubject,
}) => {
  if (!candidateLessonIds.length) return [];

  const direct = await queryRagDirect({
    question,
    courseId,
    subjectId,
    lessonId,
    organizationId,
    limit: 10,
  });

  const retrieved = await queryRagFallbackRetrieve({
    question,
    lessonIds: candidateLessonIds,
  });

  const allowed = new Set(candidateLessonIds);
  const merged = dedupeAndSortChunks(
    enrichSubjectIds([...direct, ...retrieved], lessonToSubject)
      .filter((chunk) => allowed.has(chunk.lesson_id))
      .filter((chunk) => !chunk.organization_id || chunk.organization_id === organizationId)
  , question);

  return keepCohesiveChunks(merged, scope).slice(0, MAX_CONTEXT_CHUNKS);
};

const askGroq = async ({ question, chunks, questionStyle, scope }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AppError('GROQ_API_KEY is not configured', 500);

  const structuredContext = chunks.slice(0, MAX_CONTEXT_CHUNKS).map((chunk) => ({
    text: chunk.text.slice(0, 700),
    lesson_id: chunk.lesson_id,
    subject_id: chunk.subject_id,
    source_type: chunk.source_type,
    source_name: chunk.source_name,
    page: chunk.page,
    timestamp: chunk.timestamp,
    score: chunk.score,
  }));

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.0,
      max_tokens: 500,
      messages: [
        { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            `نمط السؤال: ${questionStyle}`,
            `النطاق المستخدم: ${scope}`,
            `السؤال: ${question}`,
            'السياق المعتمد (JSON):',
            JSON.stringify(structuredContext, null, 2),
            'تعليمات التنسيق: ابدأ بجواب مباشر، ثم شرح قصير تعليمي غير مكرر.',
          ].join('\n\n'),
        },
      ],
    }),
  });

  const body = await parseJsonResponse(response);
  if (!response.ok) throw new AppError(body?.error?.message || 'Groq request failed', 502);

  const answer = body?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new AppError('Empty response from Groq', 502);

  return answer;
};

export const askChatbot = async ({ tokenUser, question, courseId, subjectId, lessonId }) => {
  const normalizedQuestion = normalizeArabicText(question);

  if (isVagueQuestion(question)) {
    return makeRefusal({
      scope: lessonId ? 'lesson' : (subjectId ? 'subject' : 'course'),
      fallback: !lessonId,
      reason: 'السؤال عام جدًا ولا يسمح بإجابة دقيقة من سياق الحصة فقط.',
    });
  }

  const { orgId } = await resolveRequesterContext(tokenUser);

  const {
    courseLessonIds,
    subjectLessonIds,
    resolvedSubjectId,
    lessonToSubject,
  } = await getCourseContext({
    orgId,
    courseId,
    subjectId,
    lessonId,
  });

  const stages = [];

  if (lessonId && resolvedSubjectId) {
    stages.push({
      scope: 'lesson',
      candidateLessonIds: [lessonId],
      subjectId: resolvedSubjectId,
      lessonId,
      fallback: false,
    });
  }

  if (resolvedSubjectId) {
    stages.push({
      scope: 'subject',
      candidateLessonIds: subjectLessonIds,
      subjectId: resolvedSubjectId,
      lessonId: null,
      fallback: true,
    });
  }

  stages.push({
    scope: 'course',
    candidateLessonIds: courseLessonIds,
    subjectId: null,
    lessonId: null,
    fallback: true,
  });

  let selected = null;
  let fallbackAttempted = false;

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    if (index > 0) {
      fallbackAttempted = true;
    }

    const chunks = await selectStageChunks({
      question: normalizedQuestion,
      scope: stage.scope,
      courseId,
      subjectId: stage.subjectId,
      lessonId: stage.lessonId,
      organizationId: orgId,
      candidateLessonIds: stage.candidateLessonIds,
      lessonToSubject,
    });

    if (
      isStrongEnough({ chunks, scope: stage.scope })
      && hasTopicalSupport(normalizedQuestion, chunks)
    ) {
      selected = {
        ...stage,
        chunks,
        fallback: stage.scope !== 'lesson',
      };
      break;
    }
  }

  if (!selected) {
    return makeRefusal({
      scope: lessonId ? 'lesson' : (resolvedSubjectId ? 'subject' : 'course'),
      fallback: fallbackAttempted,
      reason: 'لا توجد مقاطع كافية وعالية الثقة ضمن هذا النطاق للإجابة بأمان.',
    });
  }

  const confidence = calculateConfidence(selected.chunks);
  const threshold = SCOPE_THRESHOLDS[selected.scope] || SCOPE_THRESHOLDS.course;
  if (confidence < threshold) {
    return makeRefusal({
      scope: selected.scope,
      fallback: selected.fallback,
      reason: 'الثقة في الاسترجاع أقل من الحد المطلوب، لذلك تم رفض الإجابة لتجنب التخمين.',
    });
  }

  const topScore = calculateTopScore(selected.chunks);
  if (topScore < threshold) {
    return makeRefusal({
      scope: selected.scope,
      fallback: selected.fallback,
      reason: 'أفضل دليل متاح غير كافٍ لإجابة دقيقة.',
    });
  }

  const questionStyle = detectQuestionStyle(normalizedQuestion);

  let answer = REFUSAL_ANSWER;
  try {
    answer = await askGroq({
      question: normalizedQuestion,
      chunks: selected.chunks,
      questionStyle,
      scope: selected.scope,
    });
  } catch (error) {
    return makeRefusal({
      scope: selected.scope,
      fallback: selected.fallback,
      reason: `تعذر توليد إجابة موثوقة من السياق فقط: ${error.message}`,
    });
  }

  const normalizedAnswer = normalizeArabicText(answer);
  if (!normalizedAnswer || normalizedAnswer === REFUSAL_ANSWER) {
    return makeRefusal({
      scope: selected.scope,
      fallback: selected.fallback,
      reason: 'النموذج لم يجد دعمًا كافيًا داخل مواد الدرس للإجابة بأمان.',
    });
  }

  const references = buildReferences(selected.chunks.slice(0, MAX_CONTEXT_CHUNKS));
  const explanationParts = [
    `تمت الإجابة من نطاق ${selected.scope === 'lesson' ? 'الحصة' : selected.scope === 'subject' ? 'المادة' : 'المقرر'}.`,
    `الثقة: ${confidence.toFixed(3)}.`,
  ];

  if (hasMultiSourceSupport(selected.chunks)) {
    explanationParts.push('تم دمج أدلة من أكثر من مصدر داخل نفس الدرس دون تكرار.');
  }

  return {
    answer: normalizedAnswer,
    explanation: explanationParts.join(' '),
    references,
    confidence,
    scope: selected.scope,
    fallback: selected.fallback,
  };
};
