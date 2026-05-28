import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  listComponentsController,
  createComponentController,
  updateComponentController,
  deleteComponentController,
} from '../controllers/assessmentComponentController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', listComponentsController);
router.post('/', isOrganization, createComponentController);
router.patch('/:id', isOrganization, updateComponentController);
router.delete('/:id', isOrganization, deleteComponentController);

export default router;
