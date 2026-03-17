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

const router = Router({ mergeParams: true });

router.use(authMiddleware, isOrganization);

router.post('/', createSubjectController);
router.get('/', getSubjectsController);
router.get('/:subjectId', getSubjectByIdController);
router.patch('/:subjectId', updateSubjectController);
router.delete('/:subjectId', deleteSubjectController);

export default router;

