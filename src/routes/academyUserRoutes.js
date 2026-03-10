import { Router } from 'express';
import { getAcademyUsersByOrg, getAcademyUserById } from '../controllers/academyUserController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/org/:orgId', getAcademyUsersByOrg);
router.get('/:id', getAcademyUserById);

export default router;
