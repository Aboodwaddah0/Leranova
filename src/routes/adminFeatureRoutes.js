import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import {
  listFeaturesController,
  getFeatureController,
  createFeatureController,
  updateFeatureController,
  deleteFeatureController,
  listPlanFeaturesController,
  assignPlanFeatureController,
  updatePlanFeatureController,
  removePlanFeatureController,
} from '../controllers/adminFeatureController.js';

const router = Router();

router.use(authMiddleware, isAdmin);

router.get('/features', listFeaturesController);
router.get('/features/:id', getFeatureController);
router.post('/features', createFeatureController);
router.patch('/features/:id', updateFeatureController);
router.delete('/features/:id', deleteFeatureController);

router.get('/plans/:planId/features', listPlanFeaturesController);
router.post('/plans/:planId/features', assignPlanFeatureController);
router.patch('/plans/:planId/features/:featureId', updatePlanFeatureController);
router.delete('/plans/:planId/features/:featureId', removePlanFeatureController);

export default router;
