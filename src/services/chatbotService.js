import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const RAG_QUERY_TIMEOUT_MS = Number(process.env.RAG_QUERY_TIMEOUT_MS || 10000);
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://rag-service:8000';
const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const MIN_CONFIDENCE = 0.6;
const MAX_CONTEXT_CHUNKS = 5;
const ALLOWED_SOURCE_TYPES = new Set(['video', 'pdf', 'docx', 'txt']);
const ORG_ROLES = new Set(['ACADEMY', 'SCHOOL']);

const REFUSAL_ANSWER = 'This is not covered in this lesson.';

const CHATBOT_SYSTEM_PROMPT = [
  'You are Learnova strict academic assistant.',
  'Use only the provided lesson materials context.',
  'Do NOT answer unless supported by context.',
  'Do not use external knowledge.',
  'Do not invent facts or fill gaps.',
  'If unsure, refuse.',
  `If context is insufficient, answer exactly: "${REFUSAL_ANSWER}".`,
  'Explain like a teacher using only the context.',
  'Cite references using [Ref n] when possible.',
  'Never merge unrelated chunks.',
  'Keep answers concise and accurate.',
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
    text: String(chunk.text ?? chunk.chunk_text ?? chunk.chunkText ?? '').trim(),
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

const dedupeAndSortChunks = (chunks) => {
  const deduped = new Map();

  for (const chunk of chunks) {
    if (!chunk?.text || !chunk.lesson_id || !chunk.source_type) continue;
    if (!ALLOWED_SOURCE_TYPES.has(chunk.source_type)) continue;

    const key = `${chunk.lesson_id}|${chunk.source_type}|${chunk.chunk_index ?? 'na'}|${chunk.text}`;
    const existing = deduped.get(key);
    if (!existing || chunk.score > existing.score) deduped.set(key, chunk);
  }

  return Array.from(deduped.values()).sort((a, b) => b.score - a.score);
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

const buildReferences = (chunks) => chunks.map((chunk) => ({
  text: chunk.text,
  lesson_id: chunk.lesson_id,
  subject_id: chunk.subject_id,
  source_type: chunk.source_type,
  source_name: chunk.source_name,
  page: chunk.page,
  timestamp: chunk.timestamp,
  score: chunk.score,
}));

const makeRefusal = ({ scope, fallback, reason }) => ({
  answer: REFUSAL_ANSWER,
  explanation: reason,
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
  ];

  return vaguePatterns.some((pattern) => pattern.test(normalized));
};

const isStrongEnough = (chunks) => {
  if (!chunks.length) return false;
  const topScore = Number(chunks[0].score || 0);
  const confidence = calculateConfidence(chunks);
  return topScore >= MIN_CONFIDENCE && confidence >= MIN_CONFIDENCE;
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
  );

  return keepCohesiveChunks(merged, scope).slice(0, MAX_CONTEXT_CHUNKS);
};

const askGroq = async ({ question, chunks }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AppError('GROQ_API_KEY is not configured', 500);

  const structuredContext = chunks.map((chunk) => ({
    text: chunk.text,
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
          content: `Question:\n${question}\n\nLesson Materials Context (JSON):\n${JSON.stringify(structuredContext, null, 2)}`,
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
  if (isVagueQuestion(question)) {
    return makeRefusal({
      scope: lessonId ? 'lesson' : (subjectId ? 'subject' : 'course'),
      fallback: !lessonId,
      reason: 'Question is too vague to answer safely from lesson materials.',
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

  for (const stage of stages) {
    const chunks = await selectStageChunks({
      question,
      scope: stage.scope,
      courseId,
      subjectId: stage.subjectId,
      lessonId: stage.lessonId,
      organizationId: orgId,
      candidateLessonIds: stage.candidateLessonIds,
      lessonToSubject,
    });

    if (isStrongEnough(chunks)) {
      selected = { ...stage, chunks };
      break;
    }
  }

  if (!selected) {
    return makeRefusal({
      scope: 'course',
      fallback: true,
      reason: 'No relevant high-confidence chunks found in lesson materials.',
    });
  }

  const confidence = calculateConfidence(selected.chunks);
  if (confidence < MIN_CONFIDENCE) {
    return makeRefusal({
      scope: selected.scope,
      fallback: selected.fallback,
      reason: 'Low-confidence retrieval. Refusing to avoid hallucination.',
    });
  }

  let answer = REFUSAL_ANSWER;
  try {
    answer = await askGroq({
      question,
      chunks: selected.chunks,
    });
  } catch (_error) {
    return makeRefusal({
      scope: selected.scope,
      fallback: true,
      reason: 'Generation failed. Refusing to avoid unsupported answer.',
    });
  }

  if (!answer || answer.trim().toLowerCase() === REFUSAL_ANSWER.toLowerCase()) {
    return makeRefusal({
      scope: selected.scope,
      fallback: selected.fallback,
      reason: 'Model could not produce a supported answer from lesson materials.',
    });
  }

  return {
    answer,
    explanation: `Answered from ${selected.scope}-scoped lesson materials using strict filtering and high-confidence chunks only.`,
    references: buildReferences(selected.chunks),
    confidence,
    scope: selected.scope,
    fallback: selected.fallback,
  };
};
