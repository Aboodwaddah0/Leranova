import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacher } from '../middlewares/isTeacher.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  createTeacherController,
  getTeachersController,
  getTeacherByIdController,
  updateTeacherController,
  updateMyTeacherProfileController,
  deleteTeacherController,
  getTeacherSubjectsController,
  getTeacherLessonsController,
  getMyTeacherProfileController,
  getMyCoursesController,
  getMySubjectsController,
  getMyLessonsController,
  getMyStudentsController,
} from '../controllers/teacherController.js';
import { getInstructorAnalyticsController } from '../controllers/instructorAnalyticsController.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', isTeacher, getMyTeacherProfileController);
router.patch('/me', isTeacher, updateMyTeacherProfileController);
router.get('/me/courses', isTeacher, getMyCoursesController);
router.get('/me/subjects', isTeacher, getMySubjectsController);
router.get('/me/lessons', isTeacher, getMyLessonsController);
router.get('/me/students', isTeacher, getMyStudentsController);
router.get('/me/analytics', isTeacher, getInstructorAnalyticsController);

router.get('/', getTeachersController);
router.get('/:id', getTeacherByIdController);

router.use(isOrganization);

router.post('/', createTeacherController);
router.put('/:id', updateTeacherController);
router.delete('/:id', deleteTeacherController);

router.get('/:id/subjects', getTeacherSubjectsController);
router.get('/:id/lessons', getTeacherLessonsController);

export default router;
