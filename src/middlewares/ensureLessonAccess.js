import AppError from '../utils/appError.js';
import { getLessonById } from '../services/lessonService.js';

// Middleware to ensure the requesting user has access to the specified lesson
export const ensureLessonAccess = async (req, res, next) => {
  try {
    const subjectId = Number(req.params.subjectId || req.body.subjectId);
    const lessonId = Number(req.params.lessonId || req.body.lessonId || req.query.lessonId);

    if (!subjectId || !lessonId) {
      return next(new AppError('Subject id and lesson id are required for access check', 400));
    }

    // Reuse existing service which encapsulates access rules (students, teachers, orgs)
    const lesson = await getLessonById(req.user, subjectId, lessonId);

    // attach lesson to request for downstream handlers if needed
    req.lesson = lesson;
    return next();
  } catch (err) {
    return next(err);
  }
};
