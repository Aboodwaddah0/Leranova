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
import { getLearningProfileController } from '../controllers/learningProfileController.js';
import { getAdaptiveMissionsController } from '../controllers/adaptiveMissionController.js';
import { getAIMentorController } from '../controllers/aiMentorController.js';
import { getEngagementFeedController } from '../controllers/engagementFeedController.js';
import { getSocialController } from '../controllers/socialController.js';

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
router.get('/profile', getLearningProfileController);
router.get('/missions/adaptive', getAdaptiveMissionsController);
router.get('/mentor', getAIMentorController);
router.get('/activity', getEngagementFeedController);
router.get('/social', getSocialController);

export default router;
