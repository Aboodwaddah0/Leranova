import { getStudentStats, getOrgLeaderboard, getStudentRank, getStudentAchievements, getStudentMissions, getEngagementScore, getStudentDashboard, getStreakLeaderboard, getWeeklyLeaderboard } from '../services/gamificationService.js';
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
    const { userId, orgId, mode } = await resolveStudentContext(req.user.id);
    const [leaderboard, currentRank] = await Promise.all([
      getOrgLeaderboard(orgId, mode),
      getStudentRank(userId, orgId, mode),
    ]);
    res.json({ success: true, status: 200, data: { leaderboard, currentStudentId: userId, currentRank }, error: null, timestamp: new Date().toISOString() });
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

export async function getEngagementController(req, res, next) {
  try {
    const { userId } = await resolveStudentContext(req.user.id);
    const data = await getEngagementScore(userId);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardController(req, res, next) {
  try {
    const { userId } = await resolveStudentContext(req.user.id);
    const data = await getStudentDashboard(userId);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getStreakLeaderboardController(req, res, next) {
  try {
    const { orgId, mode } = await resolveStudentContext(req.user.id);
    const data = await getStreakLeaderboard(orgId, mode);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

export async function getWeeklyLeaderboardController(req, res, next) {
  try {
    const { orgId, mode } = await resolveStudentContext(req.user.id);
    const data = await getWeeklyLeaderboard(orgId, mode);
    res.json({ success: true, status: 200, data, error: null, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}
