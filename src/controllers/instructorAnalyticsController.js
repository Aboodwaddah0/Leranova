import { getInstructorAnalytics } from '../services/instructorAnalyticsService.js';

export const getInstructorAnalyticsController = async (req, res, next) => {
  try {
    const data = await getInstructorAnalytics(req.user.id);
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
