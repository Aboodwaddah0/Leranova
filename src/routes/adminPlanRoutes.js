import { Router } from 'express';
import {
  listPlansController,
  getPlanController,
  createPlanController,
  updatePlanController,
  deletePlanController,
} from '../controllers/adminPlanController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/isAdmin.js';

const router = Router();

router.use(authMiddleware, isAdmin);

router.get('/', listPlansController);
router.get('/:id', getPlanController);
router.post('/', createPlanController);
router.patch('/:id', updatePlanController);
router.delete('/:id', deletePlanController);

export default router;
