import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  getGradeScaleController,
  upsertGradeScaleController,
  deleteGradeScaleController,
} from '../controllers/gradeScaleController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getGradeScaleController);
router.put('/', upsertGradeScaleController);
router.delete('/', deleteGradeScaleController);

export default router;
