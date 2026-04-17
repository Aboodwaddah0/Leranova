import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  getOwnOrganizationController,
  getOwnOrganizationRevenueController,
  updateOwnOrganizationController,
} from '../controllers/organizationController.js';

const router = Router();

router.use(authMiddleware, isOrganization);

router.get('/me', getOwnOrganizationController);
router.get('/revenue', getOwnOrganizationRevenueController);
router.patch('/me', updateOwnOrganizationController);

export default router;
