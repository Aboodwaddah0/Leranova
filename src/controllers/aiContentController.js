import AppError from '../utils/appError.js';
import {
  getLessonAiContent,
  generateLessonAiContent,
  regenerateFlashcardsOnly,
  regenerateMindmapOnly,
} from '../services/aiContentService.js';

const resolveLang = (req) => {
  const raw = req.query.lang || req.body?.lang || 'ar';
  return raw === 'en' ? 'en' : 'ar';
};

const ok = (res, data) =>
  res.status(200).json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });

const validLesson = (req, next) => {
  const id = Number(req.params.lessonId);
  if (!Number.isFinite(id) || id <= 0) { next(new AppError('Invalid lesson ID', 400)); return null; }
  return id;
};

export const getOrGenerateLessonAiContent = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId) return;
    const lang = resolveLang(req);

    const cached = await getLessonAiContent(lessonId, lang);
    if (cached) return ok(res, cached);

    const generated = await generateLessonAiContent(lessonId, lang);
    return ok(res, generated);
  } catch (err) { return next(err); }
};

export const regenerateLessonAiContent = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId) return;
    const lang = resolveLang(req);
    const data = await generateLessonAiContent(lessonId, lang);
    return ok(res, data);
  } catch (err) { return next(err); }
};

export const regenerateFlashcardsController = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId) return;
    const lang = resolveLang(req);
    const data = await regenerateFlashcardsOnly(lessonId, lang);
    return ok(res, data);
  } catch (err) { return next(err); }
};

export const regenerateMindmapController = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId) return;
    const lang = resolveLang(req);
    const data = await regenerateMindmapOnly(lessonId, lang);
    return ok(res, data);
  } catch (err) { return next(err); }
};
