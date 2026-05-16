import { getAIMentor } from '../services/aiMentorService.js';
import { resolveStudentContext } from '../services/studentExperienceService.js';

export async function getAIMentorController(req, res, next) {
  try {
    const { userId } = await resolveStudentContext(req.user.id);
    const data = await getAIMentor(userId);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
