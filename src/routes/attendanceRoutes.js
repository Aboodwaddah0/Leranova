import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isOrganization } from '../middlewares/isOrganization.js';
import { isStudent } from '../middlewares/isStudent.js';
import * as ctrl from '../controllers/attendanceController.js';

const router = Router();

router.use(authMiddleware);

// Student self-view (daily records)
router.get('/me',       isStudent, ctrl.getMyAttendanceController);
router.get('/children',            ctrl.getChildrenAttendanceController);

// Org admin — daily class attendance (mark + view)
router.get('/class/:classId/students', isOrganization, ctrl.getClassStudentsController);
router.get('/class/:classId/summary',  isOrganization, ctrl.getClassAttendanceSummaryController);
router.post('/class/:classId',          isOrganization, ctrl.markAttendanceController);
router.get('/class/:classId',           isOrganization, ctrl.getClassAttendanceController);
router.get('/student/:studentId',       isOrganization, ctrl.getStudentAttendanceController);

export default router;
