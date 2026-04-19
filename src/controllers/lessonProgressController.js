import AppError from '../utils/appError.js';
import { getSubjectProgressSummary, upsertLessonProgress } from '../services/lessonProgressService.js';

const ensureStudent = (req) => {
  const role = String(req.user?.role || '').trim().toUpperCase();
  if (role !== 'STUDENT') {
    throw new AppError('Student account required', 403);
  }

  return Number(req.user.id);
};

export const upsertLessonProgressController = async (req, res, next) => {
  try {
    const studentId = ensureStudent(req);
    const lessonId = Number(req.params.lessonId);

    if (!Number.isInteger(lessonId) || lessonId <= 0) {
      throw new AppError('Invalid lesson id', 400);
    }

    const isCompleted = Boolean(req.body?.isCompleted);
    const data = await upsertLessonProgress({ studentId, lessonId, isCompleted });

    return res.status(200).json({
      success: true,
      message: 'Lesson progress updated successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSubjectProgressSummaryController = async (req, res, next) => {
  try {
    const studentId = ensureStudent(req);
    const subjectId = Number(req.params.subjectId);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      throw new AppError('Invalid subject id', 400);
    }

    const data = await getSubjectProgressSummary({ studentId, subjectId });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};
