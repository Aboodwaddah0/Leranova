import { Router } from 'express';
import {
  createSubjectController,
  getSubjectsController,
  getSubjectByIdController,
  updateSubjectController,
  deleteSubjectController,
} from '../controllers/subjectController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';

const router = Router();

router.use(authMiddleware, isOrganization);

router.post('/', createSubjectController);
router.get('/', getSubjectsController);
router.get('/:id', getSubjectByIdController);
router.patch('/:id', updateSubjectController);
router.delete('/:id', deleteSubjectController);

export default router;

