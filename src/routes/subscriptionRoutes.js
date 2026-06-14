import express from 'express';
import {
  getPlans,
  getPlan,
  getOrgSubscription,
  subscribe,
  initiateCheckout,
  cancel,
  recordPaymentHandler,
  getOrgPayments,
  checkActive,
  getOrgLimits,
  getMyFeatures,
} from '../controllers/subscriptionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Public routes (no auth required)
 */
router.get('/plans', getPlans);
router.get('/plans/:planId', getPlan);

/**
 * Protected routes (auth required)
 */
router.get('/organizations/:orgId', authMiddleware, getOrgSubscription);
router.post('/organizations/:orgId/subscribe', authMiddleware, subscribe);
router.post('/organizations/:orgId/checkout', authMiddleware, initiateCheckout);
router.delete('/:subscriptionId', authMiddleware, cancel);
router.post('/payments', authMiddleware, recordPaymentHandler);
router.get('/organizations/:orgId/payments', authMiddleware, getOrgPayments);
router.get('/organizations/:orgId/active', authMiddleware, checkActive);
router.get('/organizations/:orgId/limits', authMiddleware, getOrgLimits);
router.get('/my-features', authMiddleware, getMyFeatures);

export default router;
