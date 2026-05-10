import AppError from '../utils/appError.js';
import prisma from '../utils/prisma.js';
import { getLessonById } from '../services/lessonService.js';

// Middleware to ensure the requesting user has access to the specified lesson
export const ensureLessonAccess = async (req, res, next) => {
  try {
    const lessonId = Number(req.params.lessonId || req.body?.lessonId || req.query.lessonId);
    let subjectId = Number(req.params.subjectId || req.body?.subjectId);

    if (!lessonId) {
      return next(new AppError('Lesson id is required for access check', 400));
    }

    // When the route doesn't include :subjectId (e.g. /lessons/:lessonId/ai-content),
    // resolve it from the database so getLessonById can verify access normally.
    if (!subjectId) {
      const row = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { Subject_id: true },
      });
      if (!row) {
        return next(new AppError('Lesson not found', 404));
      }
      subjectId = row.Subject_id;
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
