import { getStudentSocial } from '../services/socialService.js';
import { resolveStudentContext } from '../services/studentExperienceService.js';

export async function getSocialController(req, res, next) {
  try {
    const { userId, orgId, mode } = await resolveStudentContext(req.user.id);
    const data = await getStudentSocial(userId, orgId, mode);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
