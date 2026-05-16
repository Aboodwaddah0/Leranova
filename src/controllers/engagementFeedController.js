import { getEngagementFeed } from '../services/engagementFeedService.js';
import { resolveStudentContext } from '../services/studentExperienceService.js';

export async function getEngagementFeedController(req, res, next) {
  try {
    const { userId } = await resolveStudentContext(req.user.id);
    const data = await getEngagementFeed(userId);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
