import { Router } from 'express';
import {
	register,
	login,
	loginUserController,
	loginParentController,
	forgotPasswordController,
	resetPasswordController,
} from '../controllers/authController.js';
import { loginAdminController } from '../controllers/adminAuthController.js';

const router = Router();

// Traditional registration and login
router.post('/organization/register', register);
router.post('/organization/login', login);
router.post('/user/login', loginUserController);
router.post('/parent/login', loginParentController);
router.post('/admin/login', loginAdminController);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);

export default router;