import { Router } from 'express';
import { getAllTeachers, getTeacherById } from '../controllers/teacherController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);

export default router;
