import { getInstructorAnalytics } from '../services/instructorAnalyticsService.js';
import { instructorAnalyticsQuerySchema } from '../validations/teacherValidation.js';
import AppError from '../utils/appError.js';

export const getInstructorAnalyticsController = async (req, res, next) => {
  try {
    const { error, value } = instructorAnalyticsQuerySchema.validate(req.query);
    if (error) return next(new AppError(error.details[0].message, 400));

    const data = await getInstructorAnalytics(req.user.id, value.Subject_id);
    res.json({
      success: true,
      status: 200,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
