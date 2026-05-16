import { getStudentLearningProfile } from '../services/learningProfileService.js';
import { resolveStudentContext } from '../services/studentExperienceService.js';

export async function getLearningProfileController(req, res, next) {
  try {
    const { userId } = await resolveStudentContext(req.user.id);
    const profile = await getStudentLearningProfile(userId);
    res.json({ success: true, status: 200, data: profile, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
