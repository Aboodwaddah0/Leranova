import { Router } from 'express';
import {
	createMarkController,
	getMarksController,
	getMarkByIdController,
	updateMarkController,
	deleteMarkController,
	getMyMarksController,
	getOrgMarksController,
} from '../controllers/marksController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { isTeacher } from '../middlewares/isTeacher.js';
import { isStudent } from '../middlewares/isStudent.js';
import { isOrganization } from '../middlewares/isOrganization.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', isStudent, getMyMarksController);
router.get('/org', isOrganization, getOrgMarksController);

router.use(isTeacher);

router.post('/', createMarkController);
router.get('/', getMarksController);
router.get('/:id', getMarkByIdController);
router.patch('/:id', updateMarkController);
router.delete('/:id', deleteMarkController);

export default router;
