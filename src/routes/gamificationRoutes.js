import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getStudentGamificationController, getLeaderboardController } from '../controllers/gamificationController.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', getStudentGamificationController);
router.get('/leaderboard', getLeaderboardController);

export default router;
