import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getStudentGamificationController, getLeaderboardController, getAchievementsController, getMissionsController } from '../controllers/gamificationController.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', getStudentGamificationController);
router.get('/leaderboard', getLeaderboardController);
router.get('/achievements', getAchievementsController);
router.get('/missions', getMissionsController);

export default router;
