import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacher } from '../middlewares/isTeacher.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import {
  createTeacherController,
  getTeachersController,
  getTeacherByIdController,
  updateTeacherController,
  deleteTeacherController,
  getTeacherSubjectsController,
  getTeacherLessonsController,
  getMyTeacherProfileController,
  getMyCoursesController,
  getMySubjectsController,
  getMyLessonsController,
  getMyStudentsController,
} from '../controllers/teacherController.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', isTeacher, getMyTeacherProfileController);
router.get('/me/courses', isTeacher, getMyCoursesController);
router.get('/me/subjects', isTeacher, getMySubjectsController);
router.get('/me/lessons', isTeacher, getMyLessonsController);
router.get('/me/students', isTeacher, getMyStudentsController);

router.get('/', getTeachersController);
router.get('/:id', getTeacherByIdController);

router.use(isOrganization);

router.post('/', createTeacherController);
router.put('/:id', updateTeacherController);
router.delete('/:id', deleteTeacherController);

router.get('/:id/subjects', getTeacherSubjectsController);
router.get('/:id/lessons', getTeacherLessonsController);

export default router;
