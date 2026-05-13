import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getStudentGamificationController,
  getLeaderboardController,
  getAchievementsController,
  getMissionsController,
  getEngagementController,
  getDashboardController,
  getStreakLeaderboardController,
  getWeeklyLeaderboardController,
} from '../controllers/gamificationController.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', getStudentGamificationController);
router.get('/dashboard', getDashboardController);
router.get('/engagement', getEngagementController);
router.get('/missions', getMissionsController);
router.get('/achievements', getAchievementsController);
router.get('/leaderboard', getLeaderboardController);
router.get('/leaderboard/streak', getStreakLeaderboardController);
router.get('/leaderboard/weekly', getWeeklyLeaderboardController);

export default router;
