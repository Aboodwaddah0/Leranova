import { Router } from 'express';
import { getAllStudents, getStudentById } from '../controllers/studentController.js';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles('Admin', 'Teacher', 'Academy'), getAllStudents);
router.get('/:id', getStudentById);

export default router;
