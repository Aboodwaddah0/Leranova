import { Router } from 'express';
import { getParentById } from '../controllers/parentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/:id', getParentById);

export default router;
