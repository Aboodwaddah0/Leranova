import { Router } from 'express';
import {
  createEnrollmentController,
  getAllEnrollmentsController,
  getEnrollmentsByCourseController,
  getEnrollmentsByUserController,
  deleteEnrollmentController,
} from '../controllers/enrollmentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';

const router = Router();

router.use(authMiddleware);

router.post('/', isOrganization, createEnrollmentController);
router.get('/', isOrganization, getAllEnrollmentsController);
router.get('/course/:courseId', isOrganization, getEnrollmentsByCourseController);
router.get('/user/:userId', isOrganization, getEnrollmentsByUserController);
router.delete('/user/:userId/course/:courseId', isOrganization, deleteEnrollmentController);

export default router;
