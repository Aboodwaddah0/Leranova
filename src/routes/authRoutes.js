import { Router } from 'express';
import { register, login, loginOrg } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/login/org', loginOrg);

export default router;
