import { Router } from 'express';
import { getAllSubjects, getSubjectById, createSubject, updateSubject, deleteSubject } from '../controllers/subjectController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllSubjects);
router.get('/:id', getSubjectById);
router.post('/', createSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;
