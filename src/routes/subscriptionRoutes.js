import express from 'express';
import {
  getPlans,
  getPlan,
  getOrgSubscription,
  subscribe,
  cancel,
  recordPaymentHandler,
  getOrgPayments,
  checkActive,
  getOrgLimits
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
router.delete('/:subscriptionId', authMiddleware, cancel);
router.post('/payments', authMiddleware, recordPaymentHandler);
router.get('/organizations/:orgId/payments', authMiddleware, getOrgPayments);
router.get('/organizations/:orgId/active', authMiddleware, checkActive);
router.get('/organizations/:orgId/limits', authMiddleware, getOrgLimits);

export default router;
