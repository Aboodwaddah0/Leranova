import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  createTeacherController,
  getTeachersController,
  getTeacherByIdController,
  updateTeacherController,
  deleteTeacherController,
  getTeacherSubjectsController,
  getTeacherLessonsController,
} from '../controllers/teacherController.js';

const router = Router();

router.use(authMiddleware, isOrganization);

router.post('/', createTeacherController);
router.get('/', getTeachersController);
router.get('/:id', getTeacherByIdController);
router.put('/:id', updateTeacherController);
router.delete('/:id', deleteTeacherController);

router.get('/:id/subjects', getTeacherSubjectsController);
router.get('/:id/lessons', getTeacherLessonsController);

export default router;
