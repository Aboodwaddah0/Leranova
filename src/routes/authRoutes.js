import { Router } from 'express';
import {
	register,
	login,
	loginUserController,
	loginParentController,
	forgotPasswordController,
	resetPasswordController,
	changePasswordController,
	getMeController,
	verifyOrgEmailController,
	stripeStatusController,
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { loginAdminController } from '../controllers/adminAuthController.js';

const router = Router();

router.get('/me', authMiddleware, getMeController);
router.get('/stripe-status', stripeStatusController);

// Traditional registration and login
router.post('/organization/register', register);
router.post('/organization/login', login);
router.get('/organization/verify-email/:token', verifyOrgEmailController);
router.post('/user/login', loginUserController);
router.post('/parent/login', loginParentController);
router.post('/admin/login', loginAdminController);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);
router.patch('/change-password', authMiddleware, changePasswordController);

export default router;