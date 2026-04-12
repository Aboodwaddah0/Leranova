import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import {
  getDashboardMetrics,
  getRevenueAnalytics,
  getOrganizationAnalytics,
} from '../controllers/adminAnalyticsController.js';

const router = Router();

router.use(authMiddleware, isAdmin);

router.get('/dashboard', getDashboardMetrics);
router.get('/revenue', getRevenueAnalytics);
router.get('/organizations', getOrganizationAnalytics);

export default router;
