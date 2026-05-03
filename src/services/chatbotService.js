import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const RAG_QUERY_TIMEOUT_MS = Number(process.env.RAG_QUERY_TIMEOUT_MS || 10000);
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://rag-service:8000';
const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SCOPE_THRESHOLDS = {
  lesson: 0.4,
  subject: 0.4,
  course: 0.4,
};

const MAX_CONTEXT_CHUNKS = 8;
const MIN_CONTEXT_CHUNKS = 1;
const MIN_CONFIDENCE_TO_ANSWER = 0.35;
const MIN_CHUNK_SCORE = 0.2;
const ALLOWED_SOURCE_TYPES = new Set(['video', 'pdf', 'docx', 'txt']);
const ORG_ROLES = new Set(['ACADEMY', 'SCHOOL']);

const REFUSAL_ANSWER = 'هذا غير مغطى بشكل واضح في محتوى هذه الحصة.';
const BLOCKED_FILLER_PHRASES = [
  'هذا يظهر',
  'هذا التعبير يظهر',
  'بالإضافة إلى ذلك',
  'في الوقت نفسه',
];

const CHATBOT_SYSTEM_PROMPT = [
  'أنت مساعد تعلم ذكي في Learnova بجودة عالية.',
  'افهم العربية الفصحى والعامية الشامية (فلسطيني/أردني) والكتابة غير الدقيقة.',
  'الأولوية للسياق المزوَّد من مواد الدرس. استخدمه أساسًا لإجابتك.',
  'إن لم تجد إجابة واضحة في السياق: ابدأ بالسياق المتوفر وأكمل بمعرفة عامة موثوقة مع الإشارة لذلك.',
  'إن كانت المواد فارغة تمامًا والسؤال تعليمي عام: أجب من معرفتك العامة مباشرةً.',
  'للأسئلة عن الأسئلة المتوقعة في الامتحان أو الموضوعات المهمة أو النصائح الدراسية: استخدم محتوى الدرس واستنتج بحكمة وقدّم أفكارًا مفيدة بدون تردد.',
  'قدّم إجابة دقيقة وشاملة وغير مكررة.',
  'للسؤال العام عن موضوع الحصة: قدّم ملخصًا مندمجًا من جميع المصادر المتاحة.',
  'إذا كان جزء من السؤال خارج السياق: أجب المدعوم وأكمل الآخر بمعرفة عامة.',
  'لا تدمج أفكارًا غير مرتبطة ولا تخمّن بلا أساس.',
  'استخدم سجل المحادثة الحديث فقط لفهم الضمائر والإحالات.',
].join(' ');

const GENERAL_KNOWLEDGE_SYSTEM_PROMPT = [
  'أنت مساعد تعلم ذكي في Learnova.',
  'افهم العربية الفصحى والعامية الشامية (فلسطيني/أردني) والكتابة غير الدقيقة.',
  'أجب على أسئلة الطالب بمعرفتك العامة الموثوقة لأن الموضوع غير مغطى في مواد الدرس.',
  'كن دقيقًا وتعليميًا ومختصرًا. لا تختلق معلومات غير مؤكدة.',
  'إن كان السؤال غامضًا جدًا، اطلب توضيحًا قصيرًا بدلًا من الرفض.',
  'استخدم سجل المحادثة الحديث فقط لفهم الضمائر والإحالات.',
].join(' ');

const HYBRID_SYSTEM_PROMPT = [
  'أنت مساعد تعلم ذكي في Learnova بجودة عالية.',
  'افهم العربية الفصحى والعامية الشامية (فلسطيني/أردني) والكتابة غير الدقيقة.',
  'لديك سياق جزئي من مواد الدرس وستكمل الإجابة بمعرفتك العامة.',
  'أجب أولًا مما هو موجود في سياق الدرس، ثم أكمل بمعرفتك العامة إن لزم.',
  'اذكر صراحةً أي جزء مصدره الدرس وأي جزء مصدره معرفتك العامة.',
  'لا تكرر المعلومات ولا تخمّن بلا أساس.',
  'استخدم سجل المحادثة الحديث فقط لفهم الضمائر والإحالات.',
].join(' ');

const MAX_HISTORY_TURNS = 8;

const TEMPERATURE_BY_STYLE = {
  factual: 0.0,
  analytical: 0.25,
  summary: 0.4,
};

const DIALECT_TOKEN_MAP = new Map([
  ['شو', 'ماذا'],
  ['ايش', 'ماذا'],
  ['إيش', 'ماذا'],
  ['ليش', 'لماذا'],
  ['عن شو', 'ما موضوع'],
  ['احكيلي', 'اشرح'],
  ['احكي لي', 'اشرح'],
  ['قديش', 'كم'],
  ['هالحصة', 'هذه الحصة'],
  ['هالدرس', 'هذا الدرس'],
]);

const TYPO_TOKEN_MAP = new Map([
  ['مكنتها', 'مكانتها'],
  ['مكانتو', 'مكانته'],
  ['الكدس', 'القدس'],
  ['عنون', 'عنوان'],
  ['مووضوع', 'موضوع'],
]);

const GREETING_PATTERN = /^(?:مرحبا|مرحبا[ً-ٟ]*|هلا|هلو|اهلا|اهلين|أهلا|السلامs*عليكم|صباحs*الخير|مساءs*الخير|كيفs*حالك|hello|hi|hey)(?:s|$|[!?.،,؟])/iu;

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
  .replace(/[ـ]/g, '')
  .replace(/[‏‎]/g, '')
  .replace(/[ً-ٰٟ]/g, '')
  .replace(/[إأآٱ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ؤ/g, 'و')
  .replace(/ئ/g, 'ي')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[٫]/g, '.')
  .replace(/[،]{2,}/g, '،')
  .replace(/[؟?]{2,}/g, '؟')
  .replace(/[.]{2,}/g, '.')
  .replace(/\s+/g, ' ')
  .trim();

const hasArabicChars = (text) => /[؀-ۿ]/u.test(String(text || ''));
const hasLatinChars = (text) => /[A-Za-z]/u.test(String(text || ''));
const detectLang = (text) => {
  const a = hasArabicChars(text), l = hasLatinChars(text);
  if (a && !l) return 'ar';
  if (l && !a) return 'en';
  if (a && l) return 'mixed';
  return 'unknown';
};

const applyTokenMap = (input, tokenMap) => {
  let output = input;
  for (const [from, to] of tokenMap.entries()) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'giu'), `$1${to}`);
  }
  return output;
};

const normalizeUserQuestion = (rawQuestion) => {
  let normalized = normalizeArabicText(rawQuestion).toLowerCase();
  normalized = applyTokenMap(normalized, DIALECT_TOKEN_MAP);
  normalized = applyTokenMap(normalized, TYPO_TOKEN_MAP);

  if (/شو\s*بحكي\s*الدرس|ماذا\s*بحكي\s*الدرس|ما\s*بحكي\s*الدرس|عن\s*شو\s*الدرس|شو\s*موضوع\s*الحصة|شو\s*موضوع\s*الدرس/u.test(normalized)) {
    normalized = 'ما موضوع هذا الدرس';
  }

  if (/^ما\s*عنوان$/u.test(normalized) || /^عنوان$/u.test(normalized)) {
    normalized = 'ما عنوان الدرس';
  }
  if (/^ماذا\s*عن\s*القدس$/u.test(normalized) || /^شو\s*عن\s*القدس$/u.test(normalized)) {
    normalized = 'اشرح موضوع القدس في هذا الدرس';
  }
  if (/^ماذا\s*موضوع\s*هذا\s*الدرس$/u.test(normalized) || /^ما\s*موضوع\s*الدرس$/u.test(normalized)) {
    normalized = 'ما موضوع هذا الدرس';
  }

  const summaryIntent = /ماs*موضوع|ماذاs*بحكيs*الدرس|ماs*بحكيs*الدرس|موضوعs*الحصة|عنs*شوs*الدرس|لخ?[صُّ]|ملخ[صُّ]|اشرحs+الدرس|أهمs+النقاط|نقاطs+الدرس|mains+points|summarize|summary|keys+points/u.test(normalized);
  return {
    normalizedQuestion: normalized,
    retrievalQuestion: normalized,
    intent: summaryIntent ? 'summary' : 'direct',
  };
};

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
  'ما', 'شو','ماذا', 'كيف', 'لماذا', 'هل', 'من', 'متى', 'اين', 'أين', 'كم',
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
  if (/لخص|summarize|summary|ملخص|عن شو|موضوع الحصة|موضوع الدرس|ما موضوع/.test(q)) return 'summary';
  if (/حلل|فسر|وضح|لماذا|كيف|compare|analy/.test(q)) return 'analytical';
  return 'factual';
};

const splitAnswerSentences = (text) => normalizeArabicText(text)
  .split(/(?<=[.!؟\n])\s+/u)
  .map((part) => part.trim())
  .filter(Boolean);

const removeFillerPhrases = (text) => {
  let cleaned = String(text || '');

  cleaned = cleaned
    .replace(/\bالجواب\s+هو\s*[:：]?\s*/giu, '')
    .replace(/\bالجواب\s*[:：]?\s*/giu, '')
    .replace(/\bالإجابة\s+هي\s*[:：]?\s*/giu, '')
    .replace(/\bالشرح\s*[:：]?\s*/giu, '')
    .replace(/\bالتفسير\s*[:：]?\s*/giu, '');

  const explanationMarker = cleaned.search(/\b(?:الشرح|التفسير)\s*[:：]/iu);
  if (explanationMarker >= 0) {
    cleaned = cleaned.slice(0, explanationMarker).trim();
  }

  for (const phrase of BLOCKED_FILLER_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escaped, 'gi'), '');
  }
  return normalizeArabicText(cleaned).replace(/\s{2,}/g, ' ').trim();
};

const clipToMaxLength = (text, maxLength) => {
  const normalized = normalizeArabicText(text);
  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, maxLength);
  const pivot = Math.max(
    slice.lastIndexOf('،'),
    slice.lastIndexOf('.'),
    slice.lastIndexOf('؟'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf(';')
  );

  if (pivot > 60) {
    return slice.slice(0, pivot + 1).trim();
  }

  return `${slice.trim()}...`;
};

const dedupeAnswerSentences = (sentences) => {
  const unique = [];

  for (const sentence of sentences) {
    const tokens = toTokenSet(sentence);
    const isDuplicate = unique.some((existing) => {
      const sim = jaccardSimilarity(tokens, toTokenSet(existing));
      return sim >= 0.9;
    });

    if (!isDuplicate) unique.push(sentence);
  }

  return unique;
};

const getQuestionContentTokens = (question) => {
  const questionTokens = toTokenSet(question);
  return new Set(
    Array.from(questionTokens).filter((token) => !QUESTION_STOP_TOKENS.has(token))
  );
};

const keepAlignedSentences = (question, sentences) => {
  const contentTokens = getQuestionContentTokens(question);
  if (!contentTokens.size) return sentences;

  const aligned = sentences.filter((sentence) => {
    const tokens = toTokenSet(sentence);
    for (const token of contentTokens) {
      if (tokens.has(token)) return true;
    }
    return false;
  });

  return aligned.length ? aligned : sentences.slice(0, 1);
};

const formatByQuestionStyle = (questionStyle, sentences) => {
  if (!sentences.length) return '';

  if (questionStyle === 'factual') {
    return clipToMaxLength(sentences.slice(0, 4).join(' '), 800);
  }

  if (questionStyle === 'analytical') {
    return clipToMaxLength(sentences.slice(0, 5).join(' '), 1000);
  }

  return clipToMaxLength(sentences.slice(0, 8).join(' '), 1500);
};

const ensureSummaryDepth = (answer, chunks) => {
  const answerSentences = dedupeAnswerSentences(splitAnswerSentences(answer));
  if (answerSentences.length >= 3) {
    return clipToMaxLength(answerSentences.join(' '), 760);
  }

  const fromChunks = dedupeAnswerSentences(
    chunks
      .flatMap((chunk) => splitAnswerSentences(chunk.text || ''))
      .filter((sentence) => sentence.length > 20)
  );

  const merged = [...answerSentences];
  for (const sentence of fromChunks) {
    const simExists = merged.some((existing) => jaccardSimilarity(toTokenSet(existing), toTokenSet(sentence)) >= 0.85);
    if (!simExists) merged.push(sentence);
    if (merged.length >= 5)break;
  }

  return clipToMaxLength(merged.join(' '), 760);
};

const polishAnswer = ({ rawAnswer, question, questionStyle, chunks }) => {
  const stripped = stripRefusalSegments(rawAnswer);
  const cleaned = removeFillerPhrases(stripped || rawAnswer);
  if (!cleaned) return '';

  const sentences = splitAnswerSentences(cleaned);
  const deduped = dedupeAnswerSentences(sentences);
  const aligned = questionStyle === 'summary' ? deduped : keepAlignedSentences(question, deduped);
  const styled = formatByQuestionStyle(questionStyle, aligned);

  if (questionStyle === 'summary') {
    return normalizeArabicText(ensureSummaryDepth(styled, chunks || []));
  }

  return normalizeArabicText(styled);
};

const stripRefusalSegments = (text) => {
  if (!text) return '';
  const refusalRe = /(?:هذاs+غيرs+مغطى[^.]*.?|لاs+(?:يمكنني|أستطيع)s+الإجابة[^.]*.?|is+(?:cannot|can't)s+answer[^.]*.?)/giu;
  return String(text).replace(refusalRe, '').replace(/s{2,}/g, ' ').trim();
};

const polishGeneralAnswer = (rawAnswer) => {
  let cleaned = removeFillerPhrases(rawAnswer);
  cleaned = stripRefusalSegments(cleaned);
  if (!cleaned) return '';
  const sentences = splitAnswerSentences(cleaned);
  const deduped = dedupeAnswerSentences(sentences);
  const joined = deduped.join(' ');
  const result = normalizeArabicText(clipToMaxLength(joined, 2000));
  if (!result || result === REFUSAL_ANSWER) return '';
  return result;
};

const META_QUESTION_PATTERN = /(متوقع|متوقّع|محتمل|توقع|توقّع|تنبأ|أسئلة\s+امتحان|سؤال\s+امتحان|سؤال\s+متوقع|سؤال\s+مهم|أهم\s+سؤال|أهم\s+الأسئلة|اقتراح|نصيحة|نصائح|أنصح|اقترح|expected\s+question|exam\s+question|important\s+question|predict|suggest|recommend|study\s+tip)/iu;
const isMetaQuestion = (value) => META_QUESTION_PATTERN.test(String(value || ''));

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

  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { Student_id: userId },
      select: { OrgId: true },
    });

    if (student?.OrgId) {
      return { role, userId, orgId: student.OrgId };
    }

    // Academy student — not in student table, check academy_user
    const academyStudent = await prisma.academy_user.findUnique({
      where: { user_academy_id: userId },
      select: { OrgId: true },
    });

    if (!academyStudent?.OrgId) {
      throw new AppError('Student is not linked to an organization', 403);
    }

    return { role, userId, orgId: academyStudent.OrgId };
  }

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: userId },
      select: { OrgId: true },
    });

    if (!teacher?.OrgId) {
      throw new AppError('Teacher is not linked to an organization', 403);
    }

    return {
      role,
      userId,
      orgId: teacher.OrgId,
    };
  }

  // Fallback: check academy_user table
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
        limit: 8,
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

const makeRefusal = ({ scope, reason, mode = 'direct' }) => ({
  answer: REFUSAL_ANSWER,
  explanation: reason || 'لا تتوفر أدلة كافية وموثوقة داخل مواد الدرس للإجابة بدقة.',
  references: [],
  confidence: 0,
  mode,
  scope,
  fallback: false,
  source: 'none',
});

const makeGeneralAnswer = ({ answer, scope }) => ({
  answer,
  explanation: 'تمت الإجابة من المعرفة العامة لأن الموضوع غير مغطى في مواد الدرس.',
  references: [],
  confidence: 0,
  mode: 'general',
  scope,
  fallback: true,
  source: 'general',
});

const makeHybridAnswer = ({ answer, references, confidence, scope, mode, chunkCount }) => ({
  answer,
  explanation: `تمت الإجابة بدمج مواد الدرس (${chunkCount} مقاطع) مع المعرفة العامة.`,
  references,
  confidence,
  mode,
  scope,
  fallback: true,
  source: 'hybrid',
});

const isVagueQuestion = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;

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
  if (topScore >= threshold) return true;
  return confidence >= threshold;
};

const hasTopicalSupport = (question, chunks) => {
  const qLang = detectLang(question);
  const chunkLang = chunks.length ? detectLang(chunks.map((c) => c.text || '').join(' ').slice(0, 500)) : 'unknown';
  if (qLang !== chunkLang && qLang !== 'unknown' && chunkLang !== 'unknown') return true;
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
  const allChunkTokens = new Set();

  for (const chunk of chunks) {
    const chunkTokens = toTokenSet(chunk.text);
    if (!chunkTokens.size) continue;

    for (const token of chunkTokens) {
      allChunkTokens.add(token);
    }

    let shared = 0;
    for (const token of contentTokens) {
      if (chunkTokens.has(token)) shared += 1;
    }

    const overlap = contentTokens.size ? (shared / contentTokens.size) : 0;
    maxOverlap = Math.max(maxOverlap, overlap);
    maxSharedCount = Math.max(maxSharedCount, shared);
  }

  if (contentTokens.size >= 3 && maxSharedCount < 1) return false;
  if (maxSharedCount === 0) return false;
  if (maxOverlap < 0.03) return false;
  return true;
};

const rerankChunks = (chunks, question) => {
  const qTokens = toTokenSet(question);

  return chunks
    .map((chunk) => {
      const chunkTokens = toTokenSet(chunk.text);
      const overlap = jaccardSimilarity(qTokens, chunkTokens);
      const baseScore = Number(chunk.score || 0);
      const rerankedScore = Number((baseScore * 0.75 + overlap * 0.25).toFixed(4));

      return {
        ...chunk,
        score: rerankedScore,
      };
    })
    .filter((chunk) => Number(chunk.score || 0) >= MIN_CHUNK_SCORE)
    .sort((a, b) => b.score - a.score);
};

const isAnswerAlignedWithQuestion = ({ question, answer, confidence, mode }) => {
  if (mode === 'summary') return true;
  if (Number(confidence || 0) >= 0.5) return true;
  const qLang = detectLang(question);
  const aLang = detectLang(answer);
  if (qLang !== aLang && qLang !== 'unknown' && aLang !== 'unknown') return true;

  const contentTokens = getQuestionContentTokens(question);
  if (!contentTokens.size) return true;

  const answerTokens = toTokenSet(answer);
  if (!answerTokens.size) return false;

  let shared = 0;
  for (const token of contentTokens) {
    if (answerTokens.has(token)) shared += 1;
  }

  if (contentTokens.size >= 3) return shared >= 1;
  return shared >= 1;
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
    limit: 16,
  });

  const retrieved = await queryRagFallbackRetrieve({
    question,
    lessonIds: candidateLessonIds,
  });

  const allowed = new Set(candidateLessonIds);
  const merged = rerankChunks(dedupeAndSortChunks(
    enrichSubjectIds([...direct, ...retrieved], lessonToSubject)
      .filter((chunk) => allowed.has(chunk.lesson_id))
      .filter((chunk) => !chunk.organization_id || chunk.organization_id === organizationId)
  , question), question);

  return keepCohesiveChunks(merged, scope).slice(0, MAX_CONTEXT_CHUNKS);
};

const normalizeHistory = (history = []) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant'))
    .map((entry) => ({
      role: entry.role,
      content: normalizeArabicText(String(entry.content || '')).slice(0, 1200),
    }))
    .filter((entry) => entry.content.length > 0)
    .slice(-MAX_HISTORY_TURNS);
};

const askGroq = async ({ question, chunks, questionStyle, scope, modeHint, history = [] }) => {
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

  const historyMessages = normalizeHistory(history).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: TEMPERATURE_BY_STYLE[questionStyle] ?? 0.0,
      max_tokens: 800,
      messages: [
        { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
        ...historyMessages,
        {
          role: 'user',
          content: [
            `نمط السؤال: ${questionStyle}`,
            `نمط الإجابة المطلوب: ${modeHint}`,
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

const askGroqGeneral = async ({ question, systemPrompt = GENERAL_KNOWLEDGE_SYSTEM_PROMPT, history = [] }) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AppError('GROQ_API_KEY is not configured', 500);

  const historyMessages = normalizeHistory(history).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.35,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: question },
      ],
    }),
  });

  const body = await parseJsonResponse(response);
  if (!response.ok) throw new AppError(body?.error?.message || 'Groq general request failed', 502);

  const answer = body?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new AppError('Empty response from Groq (general)', 502);

  return answer;
};

export const askChatbot = async ({ tokenUser, question, courseId, subjectId, lessonId, history = [] }) => {
  const normalizedInput = normalizeUserQuestion(question);
  const normalizedQuestion = normalizedInput.normalizedQuestion;
  const retrievalQuestion = normalizedInput.retrievalQuestion;
  const refusalMode = normalizedInput.intent === 'summary' ? 'summary' : 'direct';

  if (isVagueQuestion(question)) {
    return makeRefusal({
      scope: lessonId ? 'lesson' : (subjectId ? 'subject' : 'course'),
      reason: 'السؤال عام جدًا ولا يسمح بإجابة دقيقة من سياق الحصة فقط.',
      mode: refusalMode,
    });
  }

  if (GREETING_PATTERN.test(String(question || '').trim())) {
    return {
      answer: 'أهلًا بك! كيف أستطيع مساعدتك في الدراسة اليوم؟',
      explanation: 'رسالة ترحيب.',
      references: [],
      confidence: 1,
      mode: 'conversational',
      scope: lessonId ? 'lesson' : (subjectId ? 'subject' : 'course'),
      fallback: false,
      source: 'general',
    };
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
      question: retrievalQuestion,
      scope: stage.scope,
      courseId,
      subjectId: stage.subjectId,
      lessonId: stage.lessonId,
      organizationId: orgId,
      candidateLessonIds: stage.candidateLessonIds,
      lessonToSubject,
    });

    const stageConfidence = calculateConfidence(chunks);
    const strongEnough = isStrongEnough({ chunks, scope: stage.scope })
      || stageConfidence >= 0.35
      || (normalizedInput.intent === 'summary' && chunks.length >= 2);
    const topicalEnough = hasTopicalSupport(normalizedQuestion, chunks)
      || normalizedInput.intent === 'summary';

    if (strongEnough && topicalEnough) {
      selected = {
        ...stage,
        chunks,
        fallback: stage.scope !== 'lesson',
      };
      break;
    }
  }

  if (!selected) {
    const scope = lessonId ? 'lesson' : (resolvedSubjectId ? 'subject' : 'course');
    try {
      const generalAnswer = await askGroqGeneral({ question: normalizedQuestion, history });
      const polished = polishGeneralAnswer(generalAnswer);
      if (polished && polished !== REFUSAL_ANSWER) {
        return makeGeneralAnswer({ answer: polished, scope });
      }
    } catch {
      // fall through to hard refusal
    }
    return makeRefusal({
      scope,
      reason: 'لا توجد مقاطع كافية وعالية الثقة ضمن هذا النطاق للإجابة بأمان.',
      mode: refusalMode,
    });
  }

  if (!selected.chunks.length) {
    return makeRefusal({
      scope: selected.scope,
      reason: 'لا توجد مقاطع ذات صلة كافية داخل سياق الدرس.',
      mode: refusalMode,
    });
  }

  const confidence = calculateConfidence(selected.chunks);
  const metaQuestion = isMetaQuestion(normalizedQuestion);
  if (confidence < MIN_CONFIDENCE_TO_ANSWER || metaQuestion) {
    try {
      const weakContextStr = selected.chunks.slice(0, 6).map((c) => c.text).join('\n---\n');
      const hybridQuestion = `السؤال: ${normalizedQuestion}\n\nسياق جزئي من الدرس:\n${weakContextStr}`;
      const hybridAnswer = await askGroqGeneral({
        question: hybridQuestion,
        systemPrompt: HYBRID_SYSTEM_PROMPT,
        history,
      });
      const polished = polishGeneralAnswer(hybridAnswer);
      if (polished && polished !== REFUSAL_ANSWER) {
        return makeHybridAnswer({
          answer: polished,
          references: buildReferences(selected.chunks.slice(0, 6)),
          confidence,
          scope: selected.scope,
          mode: metaQuestion ? 'meta' : refusalMode,
          chunkCount: selected.chunks.length,
        });
      }
    } catch {
      // fall through to hard refusal
    }
    if (confidence < MIN_CONFIDENCE_TO_ANSWER) {
      return makeRefusal({
        scope: selected.scope,
        reason: 'الثقة أقل من الحد الأدنى الآمن للإجابة.',
        mode: refusalMode,
      });
    }
  }

  const questionStyle = detectQuestionStyle(normalizedQuestion);
  const answerMode = questionStyle === 'summary'
    ? 'summary'
    : (questionStyle === 'analytical' ? 'inferred' : (normalizedInput.intent === 'summary' ? 'summary' : 'direct'));

  let answer = REFUSAL_ANSWER;
  try {
    answer = await askGroq({
      question: normalizedQuestion,
      chunks: selected.chunks,
      questionStyle,
      scope: selected.scope,
      modeHint: answerMode,
      history,
    });
  } catch (error) {
    return makeRefusal({
      scope: selected.scope,
      reason: `تعذر توليد إجابة موثوقة من السياق فقط: ${error.message}`,
      mode: answerMode,
    });
  }

  const normalizedAnswer = metaQuestion
    ? polishGeneralAnswer(answer)
    : polishAnswer({
        rawAnswer: answer,
        question: normalizedQuestion,
        questionStyle,
        chunks: selected.chunks,
      });
  if (!normalizedAnswer || normalizedAnswer === REFUSAL_ANSWER) {
    try {
      const fallbackAnswer = await askGroqGeneral({
        question: normalizedQuestion,
        systemPrompt: HYBRID_SYSTEM_PROMPT,
        history,
      });
      const fallbackPolished = polishGeneralAnswer(fallbackAnswer);
      if (fallbackPolished && fallbackPolished !== REFUSAL_ANSWER) {
        return makeHybridAnswer({
          answer: fallbackPolished,
          references: buildReferences(selected.chunks.slice(0, 4)),
          confidence,
          scope: selected.scope,
          mode: answerMode,
          chunkCount: selected.chunks.length,
        });
      }
    } catch {
      // fall through
    }
    return makeRefusal({
      scope: selected.scope,
      reason: 'النموذج لم يجد دعمًا كافيًا داخل مواد الدرس للإجابة بأمان.',
      mode: answerMode,
    });
  }

  if (
    !metaQuestion
    && answerMode !== 'general'
    && answerMode !== 'conversational'
    && !isAnswerAlignedWithQuestion({
      question: normalizedQuestion,
      answer: normalizedAnswer,
      confidence,
      mode: answerMode,
    })
  ) {
    return makeRefusal({
      scope: selected.scope,
      reason: 'الإجابة المتولدة غير متطابقة موضوعيًا مع السؤال المطلوب ضمن مواد الدرس.',
      mode: answerMode,
    });
  }

  const references = buildReferences(selected.chunks.slice(0, MAX_CONTEXT_CHUNKS));
  const explanationParts = [
    `تمت الإجابة من نطاق ${selected.scope === 'lesson' ? 'الحصة' : selected.scope === 'subject' ? 'المادة' : 'المقرر'}.`,
    `نمط الإجابة: ${answerMode}.`,
    `عدد المقاطع المستخدمة: ${selected.chunks.length}.`,
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
    mode: answerMode,
    scope: selected.scope,
    fallback: selected.fallback,
    source: 'lesson',
  };
};