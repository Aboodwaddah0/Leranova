import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  computeGradesController,
  listComputedGradesController,
  getRankingsController,
} from '../controllers/computedGradeController.js';

const router = Router();

router.use(authMiddleware);

router.post('/compute', isOrganization, computeGradesController);
router.get('/', isOrganization, listComputedGradesController);
router.get('/rankings', isOrganization, getRankingsController);

export default router;
