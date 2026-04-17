import { Router } from 'express';
import {
  getCoursePaymentStatus,
  handleStripeWebhook,
  getStudentPurchases,
} from '../controllers/coursePaymentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { checkCourseAccess } from '../middlewares/courseAccessMiddleware.js';

const router = Router();

// Webhook من Stripe (بدون auth middleware)
router.post('/webhook/stripe', handleStripeWebhook);

// باقي الـ routes تحتاج auth
router.use(authMiddleware);

// الحصول على حالة الدفع للكورس
router.get('/courses/:courseId/payment-status', getCoursePaymentStatus);

// الحصول على جميع مشتريات الطالب
router.get('/student/purchases', getStudentPurchases);

export default router;
