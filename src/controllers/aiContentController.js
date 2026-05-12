import AppError from '../utils/appError.js';
import {
  getLessonAiContent,
  generateLessonAiContent,
  regenerateFlashcardsOnly,
  regenerateMindmapOnly,
  publishAiContent,
  unpublishAiContent,
  updateAiFlashcards,
  updateAiMindmap,
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

const requireTeacher = (req, next) => {
  if (req.user?.role !== 'TEACHER') {
    next(new AppError('Only teachers can perform this action', 403));
    return false;
  }
  return true;
};

export const getOrGenerateLessonAiContent = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId) return;
    const lang = resolveLang(req);
    const role = req.user?.role || 'STUDENT';

    const cached = await getLessonAiContent(lessonId, lang, role);

    // Students: only published content
    if (role === 'STUDENT') {
      return ok(res, cached ?? { flashcards: null, mindmap: null, status: 'draft', published: false });
    }

    // Teachers: return whatever is in the DB (draft or published).
    // Never auto-generate on GET — teacher must explicitly click Generate.
    return ok(res, cached ?? { flashcards: null, mindmap: null, status: 'draft', published: false });
  } catch (err) { return next(err); }
};

export const regenerateLessonAiContent = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId || !requireTeacher(req, next)) return;
    const lang = resolveLang(req);
    const data = await generateLessonAiContent(lessonId, lang);
    return ok(res, data);
  } catch (err) { return next(err); }
};

export const regenerateFlashcardsController = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId || !requireTeacher(req, next)) return;
    const lang = resolveLang(req);
    const data = await regenerateFlashcardsOnly(lessonId, lang);
    return ok(res, data);
  } catch (err) { return next(err); }
};

export const regenerateMindmapController = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId || !requireTeacher(req, next)) return;
    const lang = resolveLang(req);
    const data = await regenerateMindmapOnly(lessonId, lang);
    return ok(res, data);
  } catch (err) { return next(err); }
};

export const publishAiContentController = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId || !requireTeacher(req, next)) return;
    const data = await publishAiContent(lessonId);
    return ok(res, data);
  } catch (err) { return next(err); }
};

export const unpublishAiContentController = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId || !requireTeacher(req, next)) return;
    const data = await unpublishAiContent(lessonId);
    return ok(res, data);
  } catch (err) { return next(err); }
};

export const updateFlashcardsController = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId || !requireTeacher(req, next)) return;
    const lang = resolveLang(req);
    const { flashcards } = req.body;
    const data = await updateAiFlashcards(lessonId, lang, flashcards);
    return ok(res, data);
  } catch (err) { return next(err); }
};

export const updateMindmapController = async (req, res, next) => {
  try {
    const lessonId = validLesson(req, next);
    if (!lessonId || !requireTeacher(req, next)) return;
    const lang = resolveLang(req);
    const { mindmap } = req.body;
    const data = await updateAiMindmap(lessonId, lang, mindmap);
    return ok(res, data);
  } catch (err) { return next(err); }
};
