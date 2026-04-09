import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  getSchoolSettingsController,
  runAnnualPromotionController,
  updateSchoolSettingsController,
} from '../controllers/schoolSettingsController.js';

const router = Router();

router.use(authMiddleware, isOrganization);

router.get('/', getSchoolSettingsController);
router.patch('/', updateSchoolSettingsController);
router.post('/promotions/run', runAnnualPromotionController);

export default router;
