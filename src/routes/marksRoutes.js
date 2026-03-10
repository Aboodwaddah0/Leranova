import { Router } from 'express';
import { getMarksByUser, createMark, updateMark, deleteMark } from '../controllers/marksController.js';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/user/:userId', getMarksByUser);
router.post('/', authorizeRoles('Teacher', 'Admin'), createMark);
router.put('/:id', authorizeRoles('Teacher', 'Admin'), updateMark);
router.delete('/:id', authorizeRoles('Admin'), deleteMark);

export default router;
