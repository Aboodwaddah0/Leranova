import { getAdaptiveInsights } from '../services/adaptiveInsightsService.js';
import { resolveStudentContext } from '../services/studentExperienceService.js';

export async function getAdaptiveInsightsController(req, res, next) {
  try {
    const { userId } = await resolveStudentContext(req.user.id);
    const data = await getAdaptiveInsights(userId);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
