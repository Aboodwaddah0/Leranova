import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { triggerLessonRagIngestion, verifyQdrantLessonChunks } from './rag.service.js';
import { notifyTrackMembers } from './notificationService.js';

const RAG_SERVICE_URL  = process.env.RAG_SERVICE_URL  || 'http://rag-service:8000';
const GROQ_API_URL     = process.env.GROQ_API_URL     || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL       = process.env.GROQ_MODEL       || 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS  = Number(process.env.GROQ_TIMEOUT_MS || 30000);

/* ─── System prompts ─────────────────────────────────────────────────────── */

const SYS = {
  ar: {
    combined:    'أنت مساعد تعليمي ذكي. مهمتك تحويل النص إلى بطاقات تعليمية وخريطة ذهنية بصيغة JSON صالح فقط. لا تضف معلومات خارج النص. استخدم لغة عربية فصحى واضحة. استخدم المصطلحات التقنية الصحيحة: كائن، صنف، دالة، متغير، وراثة، تغليف، تجريد. لا تستخدم التعريب الصوتي مثل ويبجكت أو كلاس.',
    flashcards:  'أنت مساعد تعليمي ذكي. مهمتك توليد Flashcards فقط بصيغة JSON صالح. لا تضف معلومات خارج النص. استخدم لغة عربية فصحى واضحة. استخدم المصطلحات التقنية الصحيحة: كائن، صنف، دالة، متغير، وراثة. لا تستخدم التعريب الصوتي.',
    mindmap:     'أنت مساعد تعليمي ذكي. مهمتك توليد Mind Map فقط بصيغة JSON صالح. لا تضف معلومات خارج النص. استخدم لغة عربية فصحى واضحة. استخدم المصطلحات التقنية الصحيحة: كائن، صنف، دالة، متغير، وراثة. لا تستخدم التعريب الصوتي.',
  },
  en: {
    combined:    'You are an intelligent educational assistant. Your task: convert the provided text into flashcards and a mind map in valid JSON only. Do not add information outside the text. Use clear, precise English. Use proper technical terms (Object, Class, Function, Variable, Inheritance, Encapsulation, Abstraction). Return valid JSON only, no markdown.',
    flashcards:  'You are an intelligent educational assistant. Your task: generate Flashcards ONLY from the provided text in valid JSON. Do not add information outside the text. Use clear, precise English. Return valid JSON only, no markdown.',
    mindmap:     'You are an intelligent educational assistant. Your task: generate a Mind Map ONLY from the provided text in valid JSON. Do not add information outside the text. Use clear, precise English. Return valid JSON only, no markdown.',
  },
};

/* ─── Prompt builders ────────────────────────────────────────────────────── */

const PROMPTS = {
  ar: {
    combined: (title, content) => `
أنت مساعد تعليمي ذكي. أعد JSON صالح فقط بهذا الشكل:
{
  "flashcards": [ { "question": "السؤال", "answer": "الإجابة الكاملة" } ],
  "mindmap": {
    "title": "${title}",
    "branches": [ { "label": "الفرع", "children": ["نقطة 1","نقطة 2"] } ]
  }
}

قواعد Flashcards:
- إجابة كاملة بجملة أو جملتين، ليست كلمة واحدة
- أسئلة متنوعة: تعريف، مقارنة، تطبيق، سبب، فرق
- 7–12 بطاقة

قواعد Mind Map:
- 5–8 فروع رئيسية
- 3–6 نقاط فرعية لكل فرع، كل نقطة تحمل معلومة مستقلة
- خريطة شاملة غنية بالتفاصيل

المصطلحات: كائن (Object)، صنف (Class)، دالة (Function)، متغير (Variable)، وراثة (Inheritance).
لا تستخدم التعريب الصوتي.

النص:
${content}`.trim(),

    flashcards: (title, content) => `
أنت مساعد تعليمي ذكي. أعد JSON صالح فقط بهذا الشكل:
{ "flashcards": [ { "question": "السؤال", "answer": "الإجابة الكاملة" } ] }

قواعد Flashcards:
- إجابة كاملة بجملة أو جملتين، ليست كلمة واحدة
- إذا المفهوم يحتاج تعريف، اذكره كاملاً مع مثال إن أمكن
- أسئلة متنوعة: تعريف، مقارنة، تطبيق، سبب، فرق بين مفهومين
- لا تكرر نفس الفكرة في بطاقتين
- 7–12 بطاقة لتغطية الدرس بشكل شامل

المصطلحات: كائن (Object)، صنف (Class)، دالة (Function)، متغير (Variable)، وراثة (Inheritance).
لا تستخدم التعريب الصوتي أبداً مثل "ويبجكت" أو "كلاس".

عنوان الدرس: ${title}
النص:
${content}`.trim(),

    mindmap: (title, content) => `
أنت مساعد تعليمي ذكي. أعد JSON صالح فقط بهذا الشكل:
{
  "mindmap": {
    "title": "${title}",
    "branches": [ { "label": "الفرع الرئيسي", "children": ["نقطة 1","نقطة 2","نقطة 3"] } ]
  }
}

قواعد Mind Map:
- 5–8 فروع رئيسية تغطي جميع محاور الدرس
- 3–6 نقاط فرعية لكل فرع، كل نقطة معلومة مستقلة
- استخرج أكبر قدر من التفاصيل
- لا تختصر أو تحذف مفاهيم مهمة

المصطلحات: كائن (Object)، صنف (Class)، دالة (Function)، متغير (Variable)، وراثة (Inheritance).
لا تستخدم التعريب الصوتي.

النص:
${content}`.trim(),
  },

  en: {
    combined: (title, content) => `
⚠️ LANGUAGE RULE — MANDATORY: Every single word in your JSON output MUST be in English.
Do NOT write any Arabic characters anywhere. Translate every concept from the source text into English.
If you write even one Arabic word, the output is invalid.

You are an educational assistant. Read the source text (which may be in Arabic) and generate English-language learning tools.

Return valid JSON only — no markdown, no extra text:
{
  "flashcards": [
    { "question": "What is OOP?", "answer": "OOP stands for Object-Oriented Programming, a paradigm that organises code around objects rather than functions." }
  ],
  "mindmap": {
    "title": "${title}",
    "branches": [
      { "label": "Core Concepts", "children": ["Object", "Class", "Inheritance"] }
    ]
  }
}

Flashcard rules (ALL text in English):
- Answer: one or two complete, clear English sentences — never a single word
- Include definition + simple example where helpful
- Varied types: definition, comparison, application, why, difference between two concepts
- 7–12 cards covering the lesson fully

Mind Map rules (ALL text in English):
- 5–8 main branches covering all lesson topics
- 3–6 English sub-points per branch, each containing independent information
- Comprehensive and detail-rich

Lesson title (translate to English in output): ${title}
Source text:
${content}`.trim(),

    flashcards: (title, content) => `
⚠️ LANGUAGE RULE — MANDATORY: Every word in your JSON output MUST be in English.
Do NOT write any Arabic characters. Translate all concepts from the source text into English.

You are an educational assistant. Read the source text (which may be in Arabic) and generate English flashcards.

Return valid JSON only — no markdown, no extra text:
{ "flashcards": [ { "question": "What is a Class?", "answer": "A class is a blueprint or template used to create objects. It defines the attributes and methods that its objects will have." } ] }

Rules (ALL text in English):
- Answer: one or two complete English sentences — never a single word or bare term
- Include full definition with a simple example where helpful
- Varied types: definition, comparison, application, why, difference between two concepts
- No repeated ideas across cards
- 7–12 cards for full coverage

Lesson title: ${title}
Source text:
${content}`.trim(),

    mindmap: (title, content) => `
⚠️ LANGUAGE RULE — MANDATORY: Every word in your JSON output MUST be in English.
Do NOT write any Arabic characters. Translate all concepts from the source text into English.

You are an educational assistant. Read the source text (which may be in Arabic) and generate an English mind map.

Return valid JSON only — no markdown, no extra text:
{
  "mindmap": {
    "title": "${title}",
    "branches": [
      { "label": "Core Concepts", "children": ["Object", "Class", "Instance"] },
      { "label": "Key Properties", "children": ["Data", "Operations", "Attributes"] }
    ]
  }
}

Rules (ALL text in English):
- title, every label, every child → English only
- 5–8 main branches covering all lesson topics
- 3–6 English sub-points per branch, each independent
- Comprehensive and detail-rich — do not omit important concepts

Lesson title: ${title}
Source text:
${content}`.trim(),
  },
};

/* ─── Language-aware storage helpers ────────────────────────────────────────
   DB columns store: { "ar": <value>, "en": <value> }
   Legacy records (plain array/object) are treated as Arabic.            */

const readForLang = (stored, lang) => {
  if (!stored) return null;
  // New multi-lang format: { ar: [...], en: [...] }
  if (typeof stored === 'object' && !Array.isArray(stored)
      && (stored.ar !== undefined || stored.en !== undefined)) {
    // Never fall back to another language — return null so generation is triggered
    return stored[lang] ?? null;
  }
  // Legacy format (plain array / plain object) = Arabic only
  // Return it for Arabic requests; return null for English (triggers fresh generation)
  return lang === 'ar' ? stored : null;
};

const writeForLang = (existing, newValue, lang) => {
  if (!existing) return { [lang]: newValue };
  // Legacy plain array → convert to multi-lang, keeping old value as Arabic
  if (Array.isArray(existing)) return { ar: existing, [lang]: newValue };
  // Legacy plain object with title+branches → keep as Arabic
  if (existing.title !== undefined || existing.branches !== undefined) return { ar: existing, [lang]: newValue };
  // Already multi-lang → merge
  return { ...existing, [lang]: newValue };
};

/* ─── Fetch RAG chunks ───────────────────────────────────────────────────── */

const fetchRagChunks = async (lessonId, query) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${RAG_SERVICE_URL}/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lessonId: String(lessonId), limit: 12 }),
        signal: controller.signal,
      });
      if (!response.ok) return [];
      const body = await response.json().catch(() => null);
      return (body?.matches ?? []).map((m) => m.text || '').filter(Boolean);
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return [];
  }
};

/* ─── RAG ingestion status check ─────────────────────────────────────────── */

const checkRagIngestionStatus = async (lessonId) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(`${RAG_SERVICE_URL}/ingest-status/${lessonId}`, {
        signal: controller.signal,
      });
      if (!response.ok) return { status: 'unknown' };
      return await response.json().catch(() => ({ status: 'unknown' }));
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return { status: 'unknown' };
  }
};

/* ─── Helpers for attachment-based ingestion ────────────────────────────── */

const FILE_TYPE_TO_INGEST = { PDF: 'pdf', DOCX: 'docx', TXT: 'txt', VIDEO: 'video' };

// Throttle: only retrigger once every 3 minutes per lesson to avoid hammering the RAG service
const _lastRetrigger = new Map();
const RETRIGGER_COOLDOWN_MS = 3 * 60 * 1000;

const autoRetriggerIngestion = async (lessonId) => {
  const key = String(lessonId);
  const last = _lastRetrigger.get(key) ?? 0;
  if (Date.now() - last < RETRIGGER_COOLDOWN_MS) return;

  // Don't retrigger if RAG service is already processing this lesson
  const ragStatus = await checkRagIngestionStatus(lessonId).catch(() => ({ status: 'unknown' }));
  if (ragStatus.status === 'processing') return;

  _lastRetrigger.set(key, Date.now());
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: Number(lessonId) },
      select: {
        id: true,
        Subject_id: true,
        course: { select: { id: true, Course_id: true, track: { select: { Org_id: true } } } },
      },
    });
    if (!lesson?.course) return;

    const courseId  = lesson.course.Course_id;
    const subjectId = lesson.course.id;
    const orgId     = lesson.course.track?.Org_id;

    const attachments = await prisma.lesson_attachment.findMany({
      where: { lessonId: Number(lessonId) },
    });

    for (const att of attachments) {
      const ingestionType = FILE_TYPE_TO_INGEST[att.fileType];
      if (!ingestionType || !att.fileUrl) continue;
      triggerLessonRagIngestion({
        fileUrl: att.fileUrl,
        fileType: ingestionType,
        organizationId: orgId,
        courseId,
        subjectId,
        lessonId: Number(lessonId),
      }).catch((err) => console.error('[AI-CONTENT] auto retrigger failed', err.message));
    }
  } catch (err) {
    console.error('[AI-CONTENT] autoRetriggerIngestion error', err.message);
  }
};

/* ─── Gather lesson content ─────────────────────────────────────────────── */

export const gatherLessonContent = async (lessonId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: Number(lessonId) },
    include: { rag_assets: { select: { extractedText: true }, take: 3 } },
  });
  if (!lesson) throw new AppError('Lesson not found', 404);

  // Check Qdrant and attachment count in parallel before attempting slow RAG fetch
  const [chunkCount, attachmentCount] = await Promise.all([
    verifyQdrantLessonChunks(lessonId).catch(() => null),
    prisma.lesson_attachment.count({ where: { lessonId: Number(lessonId) } }),
  ]);

  if ((chunkCount === 0 || chunkCount === null) && attachmentCount > 0) {
    const ragStatus = await checkRagIngestionStatus(lessonId);
    console.warn('[AI-CONTENT] No chunks indexed yet', { lessonId, chunkCount, attachmentCount, ragStatus: ragStatus.status });
    if (ragStatus.status === 'failed') {
      throw new AppError(
        `Lesson file indexing failed: ${ragStatus.error || 'unknown error'}. Please delete and re-upload the file.`,
        422,
      );
    }
    if (ragStatus.status === 'processing') {
      throw new AppError(
        'Lesson content is being indexed. Please wait a few minutes and try again.',
        422,
      );
    }
    // Status unknown/not started — retrigger and ask user to wait
    autoRetriggerIngestion(lessonId);
    throw new AppError(
      'Lesson files are still being indexed. Please wait 1–2 minutes and try again.',
      422,
    );
  }

  if (attachmentCount === 0) {
    throw new AppError(
      'No lesson content found. Please upload a PDF, Word document, or video file to this lesson first.',
      422,
    );
  }

  // Chunks exist in Qdrant — build content from all sources
  const parts = [];
  if (lesson.name) parts.push(`Lesson title: ${lesson.name}`);
  if (lesson.Description) parts.push(lesson.Description);
  for (const asset of lesson.rag_assets) {
    if (asset.extractedText) parts.push(asset.extractedText.slice(0, 2000));
  }
  const chunks = await fetchRagChunks(lessonId, lesson.name || 'lesson');
  parts.push(...chunks.slice(0, 10));

  const content = parts.join('\n\n').slice(0, 6000).trim();

  if (content.length < 50) {
    // Chunks exist but retrieval returned empty — embedding model is still warming up
    throw new AppError(
      'Content retrieval service is warming up. Please try again in 30 seconds.',
      422,
    );
  }

  return { lesson, content };
};

/* ─── Call Groq ─────────────────────────────────────────────────────────── */

const doGroqFetch = async (apiKey, model, maxTokens, systemPrompt, prompt) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: prompt },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  return response;
};

export const callGroq = async (prompt, systemPrompt, model = GROQ_MODEL, maxTokens = 3000) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AppError('GROQ_API_KEY is not configured', 500);

  // Retry once on rate-limit (429) with the suggested retry-after delay (capped at 30s)
  let response = await doGroqFetch(apiKey, model, maxTokens, systemPrompt, prompt);

  if (response.status === 429) {
    const retryAfter = Math.min(Number(response.headers.get('retry-after') || 25), 30);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    response = await doGroqFetch(apiKey, model, maxTokens, systemPrompt, prompt);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new AppError(`Groq request failed: ${text}`, 502);
  }

  const body = await response.json();
  const raw = body?.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new AppError('Empty response from Groq', 502);
  return raw;
};

/* ─── Parse helpers ─────────────────────────────────────────────────────── */

const extractJSON = (raw) => {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try direct parse first
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // Find the earliest { or [ — whichever comes first
  const objStart = cleaned.indexOf('{');
  const arrStart = cleaned.indexOf('[');
  const start = objStart === -1 ? arrStart
              : arrStart === -1 ? objStart
              : Math.min(objStart, arrStart);
  if (start === -1) throw new Error('No JSON found in response');

  const open  = cleaned[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0, inString = false, escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape)                      { escape = false; continue; }
    if (ch === '\\' && inString)     { escape = true;  continue; }
    if (ch === '"')                  { inString = !inString; continue; }
    if (inString)                    continue;
    if (ch === open)                 depth++;
    else if (ch === close)           {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { break; }
      }
    }
  }

  // Truncated response — extract every complete top-level object from the fragment
  const partial = cleaned.slice(start);

  if (open === '[') {
    // Walk the array content and collect each fully-closed {} item
    const items = [];
    let d = 0, inStr = false, esc = false, itemStart = -1;
    for (let i = 1; i < partial.length; i++) {
      const c = partial[i];
      if (esc)                   { esc = false; continue; }
      if (c === '\\' && inStr)   { esc = true;  continue; }
      if (c === '"')             { inStr = !inStr; continue; }
      if (inStr)                 continue;
      if (c === '{') { if (d === 0) itemStart = i; d++; }
      else if (c === '}') {
        d--;
        if (d === 0 && itemStart !== -1) {
          items.push(partial.slice(itemStart, i + 1));
          itemStart = -1;
        }
      }
    }
    if (items.length > 0) {
      try { return JSON.parse('[' + items.join(',') + ']'); } catch { /* fall through */ }
    }
  } else {
    // Single truncated object — just close it
    try { return JSON.parse(partial + '}'); } catch { /* fall through */ }
  }

  console.error('[extractJSON] Could not parse — raw snippet:', raw.slice(0, 300));
  throw new Error('Could not extract valid JSON from response');
};

const normaliseFlashcards = (parsed) =>
  Array.isArray(parsed.flashcards)
    ? parsed.flashcards
        .map((fc) => ({ question: String(fc.question || fc.q || '').trim(), answer: String(fc.answer || fc.a || '').trim() }))
        .filter((fc) => fc.question && fc.answer)
    : [];

const normaliseMindmap = (parsed, fallbackTitle = '') => ({
  title: String(parsed.mindmap?.title || fallbackTitle).trim(),
  branches: Array.isArray(parsed.mindmap?.branches)
    ? parsed.mindmap.branches
        .map((b) => ({ label: String(b.label || b.title || b.name || '').trim(), children: Array.isArray(b.children) ? b.children.map(String).filter(Boolean) : [] }))
        .filter((b) => b.label)
    : [],
});

/* ─── Public API ────────────────────────────────────────────────────────── */

export const getLessonAiContent = async (lessonId, lang = 'ar', role = 'STUDENT') => {
  const cached = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  if (!cached) return null;

  // Students only see published content
  if (role === 'STUDENT' && cached.status !== 'published') {
    return { flashcards: null, mindmap: null, status: 'draft', published: false };
  }

  const other = lang === 'ar' ? 'en' : 'ar';
  const flashcards  = readForLang(cached.flashcards,  lang) ?? readForLang(cached.flashcards,  other);
  const mindmap     = readForLang(cached.mindmap,     lang) ?? readForLang(cached.mindmap,     other);
  const powerSlides = readForLang(cached.powerSlides, lang) ?? readForLang(cached.powerSlides, other);

  if (!flashcards && !mindmap && !powerSlides) return null;

  return {
    flashcards:  flashcards  ?? [],
    mindmap:     mindmap     ?? null,
    powerSlides: powerSlides ?? null,
    status: cached.status,
    published: cached.status === 'published',
    publishedAt: cached.publishedAt,
    cached: true,
    generatedAt: cached.updatedAt,
  };
};

export const generateLessonAiContent = async (lessonId, lang = 'ar') => {
  const { lesson, content } = await gatherLessonContent(lessonId);
  const p = PROMPTS[lang] ?? PROMPTS.ar;
  const s = SYS[lang]    ?? SYS.ar;

  // Call 1 — Flashcards only
  const rawFlashcards = await callGroq(p.flashcards(lesson.name, content), s.flashcards, 'llama-3.1-8b-instant');
  const flashcards = normaliseFlashcards(extractJSON(rawFlashcards));

  // Call 2 — Mindmap only
  const rawMindmap = await callGroq(p.mindmap(lesson.name, content), s.mindmap, 'llama-3.1-8b-instant');
  const mindmap    = normaliseMindmap(extractJSON(rawMindmap), lesson.name);

  const existing = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  const newFlashcards = writeForLang(existing?.flashcards, flashcards, lang);
  const newMindmap    = writeForLang(existing?.mindmap,    mindmap,    lang);

  const saved = await prisma.lesson_ai_content.upsert({
    where:  { lessonId: Number(lessonId) },
    create: { lessonId: Number(lessonId), flashcards: newFlashcards, mindmap: newMindmap },
    update: { flashcards: newFlashcards, mindmap: newMindmap },
  });

  return {
    flashcards: readForLang(saved.flashcards, lang),
    mindmap:    readForLang(saved.mindmap,    lang),
    status: saved.status,
    published: saved.status === 'published',
    cached: false,
    generatedAt: saved.updatedAt,
  };
};

export const regenerateFlashcardsOnly = async (lessonId, lang = 'ar', topic = '') => {
  const { lesson, content } = await gatherLessonContent(lessonId);
  const p = PROMPTS[lang] ?? PROMPTS.ar;
  const s = SYS[lang]    ?? SYS.ar;

  const focusNote = topic?.trim()
    ? (lang === 'ar' ? `\n\nملاحظة مهمة: ركّز بشكل خاص على الموضوع التالي: ${topic.trim()}` : `\n\nImportant: Focus specifically on the following topic: ${topic.trim()}`)
    : '';
  const raw    = await callGroq(p.flashcards(lesson.name, content) + focusNote, s.flashcards, 'llama-3.1-8b-instant');
  const parsed = extractJSON(raw);
  const flashcards = normaliseFlashcards(parsed);

  const existing = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  const newFlashcards = writeForLang(existing?.flashcards, flashcards, lang);

  const saved = await prisma.lesson_ai_content.upsert({
    where:  { lessonId: Number(lessonId) },
    create: { lessonId: Number(lessonId), flashcards: newFlashcards, mindmap: existing?.mindmap ?? {} },
    update: { flashcards: newFlashcards },
  });

  return {
    flashcards: readForLang(saved.flashcards, lang),
    mindmap:    readForLang(saved.mindmap,    lang),
    cached: false,
    generatedAt: saved.updatedAt,
  };
};

export const regenerateMindmapOnly = async (lessonId, lang = 'ar', topic = '') => {
  const { lesson, content } = await gatherLessonContent(lessonId);
  const p = PROMPTS[lang] ?? PROMPTS.ar;
  const s = SYS[lang]    ?? SYS.ar;

  const focusNote = topic?.trim()
    ? (lang === 'ar' ? `\n\nملاحظة مهمة: ركّز بشكل خاص على الموضوع التالي: ${topic.trim()}` : `\n\nImportant: Focus specifically on the following topic: ${topic.trim()}`)
    : '';
  const raw    = await callGroq(p.mindmap(lesson.name, content) + focusNote, s.mindmap, 'llama-3.1-8b-instant');
  const parsed = extractJSON(raw);
  const mindmap = normaliseMindmap(parsed, lesson.name);

  const existing = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  const newMindmap = writeForLang(existing?.mindmap, mindmap, lang);

  const saved = await prisma.lesson_ai_content.upsert({
    where:  { lessonId: Number(lessonId) },
    create: { lessonId: Number(lessonId), flashcards: existing?.flashcards ?? {}, mindmap: newMindmap },
    update: { mindmap: newMindmap },
  });

  return {
    flashcards: readForLang(saved.flashcards, lang),
    mindmap:    readForLang(saved.mindmap,    lang),
    status: saved.status,
    published: saved.status === 'published',
    cached: false,
    generatedAt: saved.updatedAt,
  };
};

export const publishAiContent = async (lessonId) => {
  const saved = await prisma.lesson_ai_content.update({
    where: { lessonId: Number(lessonId) },
    data: { status: 'published', publishedAt: new Date() },
  });

  prisma.lesson.findUnique({
    where: { id: Number(lessonId) },
    select: { name: true, course: { select: { Course_id: true } } },
  }).then((lesson) => {
    if (!lesson) return;
    return notifyTrackMembers(lesson.course.Course_id, {
      content: `New AI study tools (flashcards & mind map) are ready for "${lesson.name}"`,
      type: 'QUIZ',
      url: `/lessons/${lessonId}`,
    });
  }).catch(() => {});

  return { status: saved.status, publishedAt: saved.publishedAt };
};

export const unpublishAiContent = async (lessonId) => {
  const saved = await prisma.lesson_ai_content.update({
    where: { lessonId: Number(lessonId) },
    data: { status: 'draft', publishedAt: null },
  });
  return { status: saved.status };
};

export const updateAiFlashcards = async (lessonId, lang = 'ar', flashcards) => {
  if (!Array.isArray(flashcards)) throw new AppError('flashcards must be an array', 400);
  const validated = flashcards
    .map((fc) => ({ question: String(fc.question || '').trim(), answer: String(fc.answer || '').trim() }))
    .filter((fc) => fc.question && fc.answer);
  if (!validated.length) throw new AppError('No valid flashcards provided', 400);

  const existing = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  if (!existing) throw new AppError('No AI content found for this lesson. Generate first.', 404);

  const newFlashcards = writeForLang(existing.flashcards, validated, lang);
  const saved = await prisma.lesson_ai_content.update({
    where: { lessonId: Number(lessonId) },
    data: { flashcards: newFlashcards },
  });
  return { flashcards: readForLang(saved.flashcards, lang), status: saved.status };
};

export const updateAiMindmap = async (lessonId, lang = 'ar', mindmap) => {
  if (!mindmap?.title || !Array.isArray(mindmap?.branches)) {
    throw new AppError('mindmap must have title and branches array', 400);
  }
  const validated = normaliseMindmap({ mindmap });
  if (!validated.branches.length) throw new AppError('Mind map must have at least one branch', 400);

  const existing = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  if (!existing) throw new AppError('No AI content found for this lesson. Generate first.', 404);

  const newMindmap = writeForLang(existing.mindmap, validated, lang);
  const saved = await prisma.lesson_ai_content.update({
    where: { lessonId: Number(lessonId) },
    data: { mindmap: newMindmap },
  });
  return { mindmap: readForLang(saved.mindmap, lang), status: saved.status };
};

export const deleteAiFlashcards = async (lessonId) => {
  const existing = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  if (!existing) throw new AppError('No AI content found for this lesson', 404);
  await prisma.lesson_ai_content.update({
    where: { lessonId: Number(lessonId) },
    data: { flashcards: null },
  });
};

export const deleteAiMindmap = async (lessonId) => {
  const existing = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  if (!existing) throw new AppError('No AI content found for this lesson', 404);
  await prisma.lesson_ai_content.update({
    where: { lessonId: Number(lessonId) },
    data: { mindmap: null },
  });
};

/* ─── Power Slides ───────────────────────────────────────────────────────── */

const _SLIDES_SYS_AR = 'أنت مصمم عروض تقديمية. أخرج JSON صالح فقط — لا نص، لا شرح، لا ```json. يجب أن يبدأ ردك بـ {"slides":[ وينتهي بـ ]} — لا تكتب الشرائح بشكل منفصل خارج هذا الكائن. اختر نوع الشريحة المناسب. عربية فصحى.';
const _SLIDES_SYS_EN = 'You are a presentation designer. Output ONLY valid JSON — no text, no explanation, no ```json fences. Your response MUST start with {"slides":[ and end with ]} — never output slide objects outside this wrapper. CRITICAL: all slide text must be in English even if source is Arabic — translate it.';

const _buildSlidesPrompt = (title, content, numSlides, lang, topic) => {
  const focusNote = topic?.trim()
    ? (lang === 'ar'
        ? `\n\nملاحظة مهمة: ركّز بشكل خاص على: ${topic.trim()}`
        : `\n\nImportant: Focus specifically on: ${topic.trim()}`)
    : '';

  if (lang === 'ar') {
    return `أنشئ عرضاً تقديمياً تعليمياً من ${numSlides} شريحة لدرس: "${title}".

مهم جداً: يجب أن يكون ردك كائن JSON واحد بهذا الشكل بالضبط:
{"slides": [ ...الشرائح هنا... ]}

أنواع الشرائح المتاحة:
- "title": {"id":1,"type":"title","title":"...","subtitle":"..."}
- "content": {"type":"content","title":"...","bullets":["..."],"notes":"..."}
- "comparison": {"type":"comparison","title":"...","left":{"label":"...","points":[]},"right":{"label":"...","points":[]},"notes":"..."}
- "timeline": {"type":"timeline","title":"...","steps":[{"year":"...","label":"...","description":"..."}],"notes":"..."}
- "process": {"type":"process","title":"...","steps":["الخطوة 1","الخطوة 2"],"notes":"..."}
- "summary": {"type":"summary","title":"الخلاصة","bullets":["..."],"notes":"..."}

قواعد: الشريحة الأولى "title"، الأخيرة "summary"، عدد الشرائح ${numSlides}.
${focusNote}

محتوى الدرس:
${content}`.trim();
  }

  return `Create a presentation of exactly ${numSlides} slides for: "${title}".

CRITICAL: respond with ONE JSON object in this exact format:
{"slides": [ ...slides here... ]}

Slide types:
- "title": {"id":1,"type":"title","title":"...","subtitle":"..."}
- "content": {"type":"content","title":"...","bullets":["..."],"notes":"..."}
- "comparison": {"type":"comparison","title":"...","left":{"label":"...","points":[]},"right":{"label":"...","points":[]},"notes":"..."}
- "timeline": {"type":"timeline","title":"...","steps":[{"year":"...","label":"...","description":"..."}],"notes":"..."}
- "process": {"type":"process","title":"...","steps":["Step 1","Step 2"],"notes":"..."}
- "summary": {"type":"summary","title":"Key Takeaways","bullets":["..."],"notes":"..."}

Rules: first slide "title", last slide "summary", exactly ${numSlides} slides. All text in English.
${focusNote}

Lesson content:
${content}`.trim();
};

export const generatePowerSlides = async (lessonId, lang = 'ar', numSlides = 10, theme = 'blue', topic = '') => {
  const { lesson, content } = await gatherLessonContent(lessonId);
  const prompt       = _buildSlidesPrompt(lesson.name, content.slice(0, 4000), numSlides, lang, topic);
  const systemPrompt = lang === 'ar' ? _SLIDES_SYS_AR : _SLIDES_SYS_EN;

  let raw, parsed;
  for (let attempt = 0; attempt < 2; attempt++) {
    raw = await callGroq(prompt, systemPrompt, GROQ_MODEL, 4000);
    try {
      parsed = extractJSON(raw);
      break;
    } catch (e) {
      if (attempt === 1) {
        console.error('[SLIDES] JSON parse failed after retry — raw:', raw?.slice(0, 400));
        throw new AppError('AI returned invalid slide structure', 502);
      }
      console.warn('[SLIDES] JSON parse failed on attempt 1, retrying...', e.message);
    }
  }

  // Normalise whatever shape the model returned into { slides: [...] }
  let result;
  if (Array.isArray(parsed)) {
    // Bare array
    result = { title: lesson.name, slides: parsed };
  } else if (parsed?.slides && Array.isArray(parsed.slides)) {
    // Correct wrapper
    result = parsed;
  } else if (parsed?.type) {
    // Model returned a single slide object — salvage all objects from raw text
    const matches = [...(raw || '').matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*/g)];
    const salvaged = matches.reduce((acc, m) => {
      try { const o = JSON.parse(m[0]); if (o?.type) acc.push(o); } catch { /* skip */ }
      return acc;
    }, []);
    result = { title: lesson.name, slides: salvaged.length ? salvaged : [parsed] };
  } else {
    result = parsed;
  }

  if (!result?.slides || !Array.isArray(result.slides) || result.slides.length === 0) {
    console.error('[SLIDES] Invalid structure — raw response:', raw?.slice(0, 500));
    throw new AppError('AI returned invalid slide structure', 502);
  }

  const VALID_TYPES = ['title','content','summary','comparison','timeline','process','hierarchy','chart'];
  const normalizeSlide = (s, i) => {
    const base = {
      id:          s.id ?? i + 1,
      type:        VALID_TYPES.includes(s.type) ? s.type : 'content',
      title:       String(s.title || '').trim(),
      notes:       String(s.notes || '').trim(),
    };
    switch (base.type) {
      case 'title':
        return { ...base, subtitle: String(s.subtitle || '').trim() };
      case 'content':
      case 'summary':
        return { ...base, bullets: Array.isArray(s.bullets) ? s.bullets.map(b => String(b).trim()).filter(Boolean) : [] };
      case 'comparison':
        return { ...base,
          left:  { label: String(s.left?.label  || '').trim(), points: (s.left?.points  || []).map(String).filter(Boolean) },
          right: { label: String(s.right?.label || '').trim(), points: (s.right?.points || []).map(String).filter(Boolean) },
        };
      case 'timeline':
        return { ...base, steps: (s.steps || []).map(st => ({ year: String(st.year || ''), label: String(st.label || ''), description: String(st.description || '') })) };
      case 'process':
        return { ...base, steps: (s.steps || []).map(String).filter(Boolean) };
      case 'hierarchy':
        return { ...base, root: String(s.root || '').trim(), children: (s.children || []).map(c => ({ label: String(c.label || '').trim(), children: (c.children || []).map(String).filter(Boolean) })) };
      case 'chart':
        return { ...base, chartType: ['bar','pie','line'].includes(s.chartType) ? s.chartType : 'bar', labels: (s.labels || []).map(String), values: (s.values || []).map(Number) };
      default:
        return { ...base, bullets: [] };
    }
  };

  const slides = {
    title:  result.title || lesson.name,
    theme,
    slides: result.slides.map(normalizeSlide),
  };

  const existing       = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  const newPowerSlides = writeForLang(existing?.powerSlides, slides, lang);

  const saved = await prisma.lesson_ai_content.upsert({
    where:  { lessonId: Number(lessonId) },
    create: { lessonId: Number(lessonId), flashcards: existing?.flashcards ?? {}, mindmap: existing?.mindmap ?? {}, powerSlides: newPowerSlides },
    update: { powerSlides: newPowerSlides },
  });

  return {
    powerSlides: readForLang(saved.powerSlides, lang),
    cached: false,
    generatedAt: saved.updatedAt,
  };
};

export const deletePowerSlides = async (lessonId) => {
  const existing = await prisma.lesson_ai_content.findUnique({ where: { lessonId: Number(lessonId) } });
  if (!existing) throw new AppError('No AI content found for this lesson', 404);
  await prisma.lesson_ai_content.update({
    where: { lessonId: Number(lessonId) },
    data:  { powerSlides: null },
  });
};


/* ─── Scene Plan (animated video via RAG service) ───────────────────────── */

export const generateScenePlan = async (lessonId, lang = 'ar', fmt = 'explainer', focus = '', visualStyle = 'dark', interactive = false) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: Number(lessonId) } });
  if (!lesson) throw new AppError('Lesson not found', 404);

  const ragUrl = process.env.RAG_SERVICE_URL || 'http://rag-service:8000';
  const resp = await fetch(`${ragUrl}/plan-scenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson_id: String(lessonId), lang, fmt, focus, visual_style: visualStyle, interactive }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new AppError(err.detail || 'Scene plan generation failed', resp.status === 422 ? 422 : 502);
  }

  return resp.json();
};

// ── Mixed-type quiz prompt ────────────────────────────────────────────────────

export const buildMixedQuizPrompt = (lessonTitle, content, { numMCQ, numTrueFalse, numShortAnswer, difficulty, notes, lang }) => {
  const sections = [];

  if (numMCQ > 0) sections.push(lang === 'ar'
    ? `${numMCQ} أسئلة اختيار من متعدد (multipleChoice): لكل سؤال خيارات: أربعة خيارات ونسبة الإجابة الصحيحة correctAnswer (0-3).`
    : `${numMCQ} multiple-choice questions (multipleChoice): each with exactly 4 options and correctAnswer index (0-3).`);

  if (numTrueFalse > 0) sections.push(lang === 'ar'
    ? `${numTrueFalse} أسئلة صح/خطأ (trueFalse): لكل سؤال correctAnswer: 0 (صح) أو 1 (خطأ).`
    : `${numTrueFalse} true/false questions (trueFalse): each with correctAnswer: 0 (True) or 1 (False).`);

  if (numShortAnswer > 0) sections.push(lang === 'ar'
    ? `${numShortAnswer} أسئلة إجابة قصيرة (shortAnswer): لكل سؤال expectedAnswer: الإجابة النموذجية المرجعية (جملة أو جملتان).`
    : `${numShortAnswer} short-answer questions (shortAnswer): each with expectedAnswer: the reference answer (1-2 sentences).`);

  const diffGuide = lang === 'ar'
    ? ({ EASY: 'تذكر وفهم مباشر', MEDIUM: 'تطبيق ومقارنة', HARD: 'تحليل وتركيب' }[difficulty] || 'متنوع')
    : ({ EASY: 'recall & comprehension', MEDIUM: 'application & comparison', HARD: 'analysis & synthesis' }[difficulty] || 'mixed');

  const structure = `{
  "multipleChoice": [{ "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "..." }],
  "trueFalse":      [{ "question": "...", "correctAnswer": 0, "explanation": "..." }],
  "shortAnswer":    [{ "question": "...", "expectedAnswer": "...", "explanation": "..." }]
}`;

  if (lang === 'ar') return `
⚠️ قواعد صارمة: اكتب بعربية فصحى سليمة فقط. ممنوع التعريب الصوتي.
أنشئ الأسئلة التالية بناءً على محتوى الدرس:
${sections.join('\n')}
المستوى: ${difficulty} — ${diffGuide}
${notes ? `توجيه إضافي: ${notes}` : ''}

أعد JSON صالح فقط بهذا الشكل:
${structure}

ملاحظات: explanation اختياري لكن مفيد. كل نوع يُعاد كمصفوفة حتى لو كانت فارغة [].
عنوان الدرس: ${lessonTitle}
المحتوى:
${content}`.trim();

  return `
⚠️ Write all text in English only.
Generate the following questions based on the lesson content:
${sections.join('\n')}
Difficulty: ${difficulty} — ${diffGuide}
${notes ? `Additional guidance: ${notes}` : ''}

Return valid JSON only in this exact structure:
${structure}

Notes: explanation is optional but helpful. Return each type as an array even if empty [].
Lesson title: ${lessonTitle}
Content:
${content}`.trim();
};

// ── Short-answer AI grader ────────────────────────────────────────────────────
const GRADE_SYS = `You are a strict but fair quiz grader. Respond ONLY with valid JSON — no markdown, no explanation outside the JSON object.`;

export const gradeShortAnswer = async (question, expectedAnswer, studentAnswer, lang = 'ar') => {
  if (!studentAnswer || !String(studentAnswer).trim()) {
    return { correct: false, feedback: lang === 'ar' ? 'لم تُقدَّم إجابة.' : 'No answer provided.' };
  }

  const prompt = lang === 'ar'
    ? `السؤال: ${question}\nالإجابة النموذجية: ${expectedAnswer}\nإجابة الطالب: ${studentAnswer}\n\nهل الإجابة صحيحة مفاهيمياً؟ تقبّل الصياغات المختلفة طالما المعنى صحيح. أجب بـ JSON فقط:\n{"correct": true|false, "feedback": "جملة أو جملتان باللغة العربية تشرح للطالب سبب الصواب أو الخطأ"}`
    : `Question: ${question}\nExpected answer: ${expectedAnswer}\nStudent answer: ${studentAnswer}\n\nIs the student's answer conceptually correct? Accept different phrasing as long as the meaning is right. Reply with JSON only:\n{"correct": true|false, "feedback": "One or two sentences in English explaining why the answer is correct or incorrect"}`;

  try {
    const raw = await callGroq(prompt, GRADE_SYS, 'llama-3.1-8b-instant', 200);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON');
    const parsed = JSON.parse(match[0]);
    return {
      correct: Boolean(parsed.correct),
      feedback: String(parsed.feedback || ''),
    };
  } catch {
    return { correct: false, feedback: lang === 'ar' ? 'تعذّر تقييم الإجابة تلقائياً.' : 'Could not auto-grade this answer.' };
  }
};

