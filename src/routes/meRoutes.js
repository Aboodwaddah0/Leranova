import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { updateFcmToken, clearFcmToken } from '../controllers/meController.js';

const router = express.Router();

router.patch('/fcm-token',       authMiddleware, updateFcmToken);
router.delete('/fcm-token',      authMiddleware, clearFcmToken);

export default router;
