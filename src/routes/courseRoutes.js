import { Router } from 'express';
import {
  createCourseController,
  getCoursesController,
  getCourseByIdController,
  updateCourseController,
  deleteCourseController,
} from '../controllers/courseController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { orgAuthMiddleware } from '../middlewares/isOrganization.js';

const router = Router();

router.use(authMiddleware, orgAuthMiddleware);

router.post('/', createCourseController);
router.get('/', getCoursesController);
router.get('/:id', getCourseByIdController);
router.patch('/:id', updateCourseController);
router.delete('/:id', deleteCourseController);

export default router;

