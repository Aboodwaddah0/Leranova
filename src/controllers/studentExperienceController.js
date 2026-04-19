import AppError from '../utils/appError.js';
import {
  getStudentContextSummary,
  getSchoolStudentSubjects,
  getAcademyTracks,
  getAcademyTrackSubjects,
  subscribeAcademySubject,
  getAcademySubjectSubscriptions,
  verifyAcademySubjectCheckout,
} from '../services/studentExperienceService.js';

const ensureStudentRole = (req) => {
  const role = String(req.user?.role || '').trim().toUpperCase();
  if (role !== 'STUDENT') {
    throw new AppError('Student account required', 403);
  }

  return Number(req.user.id);
};

export const getStudentContextController = async (req, res, next) => {
  try {
    const userId = ensureStudentRole(req);
    const data = await getStudentContextSummary(userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSchoolSubjectsController = async (req, res, next) => {
  try {
    const userId = ensureStudentRole(req);
    const data = await getSchoolStudentSubjects(userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAcademyTracksController = async (req, res, next) => {
  try {
    const userId = ensureStudentRole(req);
    const tracks = await getAcademyTracks(userId);

    return res.status(200).json({
      success: true,
      total: tracks.length,
      data: tracks,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAcademyTrackSubjectsController = async (req, res, next) => {
  try {
    const userId = ensureStudentRole(req);
    const trackId = Number(req.params.trackId);

    if (!Number.isInteger(trackId) || trackId <= 0) {
      throw new AppError('Invalid track id', 400);
    }

    const data = await getAcademyTrackSubjects(userId, trackId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const subscribeAcademySubjectController = async (req, res, next) => {
  try {
    const userId = ensureStudentRole(req);
    const subjectId = Number(req.params.subjectId);

    if (!Number.isInteger(subjectId) || subjectId <= 0) {
      throw new AppError('Invalid subject id', 400);
    }

    const paymentMethod = String(req.body?.paymentMethod || 'STRIPE').trim().toUpperCase();
    const data = await subscribeAcademySubject({
      userId,
      subjectId,
      paymentMethod,
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription completed successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyAcademyCheckoutController = async (req, res, next) => {
  try {
    const userId = ensureStudentRole(req);
    const sessionId = String(req.query?.session_id || '').trim();

    const data = await verifyAcademySubjectCheckout({
      userId,
      sessionId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const getAcademySubscriptionsController = async (req, res, next) => {
  try {
    const userId = ensureStudentRole(req);
    const subscriptions = await getAcademySubjectSubscriptions(userId);

    return res.status(200).json({
      success: true,
      total: subscriptions.length,
      data: subscriptions,
    });
  } catch (error) {
    return next(error);
  }
};
