import { Router } from 'express';
import { register, login, loginUserController, googleOAuthCallback, requestLoginCode, verifyLoginCodeController } from '../controllers/authController.js';
import passport from 'passport';
import { googleOAuthEnabled } from '../config/oauth.js';

const router = Router();

// Traditional registration and login
router.post('/organization/register', register);
router.post('/organization/login', login);
router.post('/user/login', loginUserController);

// Google OAuth Routes
router.get('/google', (req, res, next) => {
	if (!googleOAuthEnabled) {
		return res.status(503).json({ message: 'Google OAuth is not configured on this server' });
	}

	return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get('/google/callback', (req, res, next) => {
	if (!googleOAuthEnabled) {
		return res.status(503).json({ message: 'Google OAuth is not configured on this server' });
	}

	return passport.authenticate('google', { failureRedirect: '/login' })(req, res, next);
}, googleOAuthCallback);

// Login Code Routes (2FA/Passwordless Login)
router.post('/request-login-code', requestLoginCode);
router.post('/verify-login-code', verifyLoginCodeController);

export default router;