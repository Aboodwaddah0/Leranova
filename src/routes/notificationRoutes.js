import { Router } from 'express';
import { getUserNotifications, markAsSeen } from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getUserNotifications);
router.patch('/:id/seen', markAsSeen);

export default router;
