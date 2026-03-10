import { Router } from 'express';
import { getEnrollmentsByOrg, createEnrollment, deleteEnrollment } from '../controllers/enrollmentController.js';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/org/:orgId', getEnrollmentsByOrg);
router.post('/', authorizeRoles('Admin', 'Academy'), createEnrollment);
router.delete('/', authorizeRoles('Admin', 'Academy'), deleteEnrollment);

export default router;
