import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as ctrl from '../controllers/attendanceController.js';

const router = Router();

router.use(authMiddleware);

router.get('/class/:classId/students', ctrl.getClassStudentsController);
router.post('/class/:classId', ctrl.markAttendanceController);
router.get('/class/:classId', ctrl.getClassAttendanceController);
router.get('/student/:studentId', ctrl.getStudentAttendanceController);

export default router;
