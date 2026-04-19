import { Router } from 'express';
import {
  createSubjectController,
  getSubjectsController,
  getSubjectByIdController,
  updateSubjectController,
  deleteSubjectController,
} from '../controllers/subjectController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacherOrOrganization } from '../middlewares/isTeacherOrOrganization.js';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', getSubjectsController);
router.get('/:subjectId', getSubjectByIdController);
router.post('/', isTeacherOrOrganization, createSubjectController);
router.patch('/:subjectId', isTeacherOrOrganization, updateSubjectController);
router.delete('/:subjectId', isTeacherOrOrganization, deleteSubjectController);

export default router;

