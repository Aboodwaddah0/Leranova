import { Router } from 'express';
import {
	register,
	login,
	loginUserController,
	forgotPasswordController,
	resetPasswordController,
} from '../controllers/authController.js';

const router = Router();

// Traditional registration and login
router.post('/organization/register', register);
router.post('/organization/login', login);
router.post('/user/login', loginUserController);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);

export default router;