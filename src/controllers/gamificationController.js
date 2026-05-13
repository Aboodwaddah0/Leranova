import { getStudentStats, getOrgLeaderboard, getStudentAchievements, getStudentMissions } from '../services/gamificationService.js';
import { resolveStudentContext } from '../services/studentExperienceService.js';

export async function getStudentGamificationController(req, res, next) {
  try {
    const { userId } = await resolveStudentContext(req.user.id);
    const stats = await getStudentStats(userId);
    res.json({ success: true, status: 200, data: stats, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getLeaderboardController(req, res, next) {
  try {
    const { userId, orgId } = await resolveStudentContext(req.user.id);
    const leaderboard = await getOrgLeaderboard(orgId);
    res.json({ success: true, status: 200, data: { leaderboard, currentStudentId: userId }, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getAchievementsController(req, res, next) {
  try {
    const { userId } = await resolveStudentContext(req.user.id);
    const data = await getStudentAchievements(userId);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getMissionsController(req, res, next) {
  try {
    const { userId } = await resolveStudentContext(req.user.id);
    const data = await getStudentMissions(userId);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
