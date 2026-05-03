import {
  getAllPlans,
  getPlanById,
  getOrganizationSubscription,
  createSubscription,
  isSubscriptionActive,
  recordPayment,
  getPaymentHistory,
  cancelSubscription,
  getSubscriptionLimits
} from '../services/subscriptionService.js';
import { getSubscriptionFeatureCatalog, resolveOrganizationIdFromUser } from '../services/featureService.js';
import AppError from '../utils/appError.js';

/**
 * Get all available plans
 * GET /api/subscriptions/plans
 */
export const getPlans = async (req, res, next) => {
  try {
    const plans = await getAllPlans();

    return res.status(200).json({
      message: 'Plans retrieved successfully',
      data: plans
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get plan details by ID
 * GET /api/subscriptions/plans/:planId
 */
export const getPlan = async (req, res, next) => {
  try {
    const { planId } = req.params;

    const plan = await getPlanById(parseInt(planId));

    return res.status(200).json({
      message: 'Plan retrieved successfully',
      data: plan
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get current subscription for an organization
 * GET /api/subscriptions/organizations/:orgId
 */
export const getOrgSubscription = async (req, res, next) => {
  try {
    const { orgId } = req.params;

    const subscription = await getOrganizationSubscription(parseInt(orgId));

    if (!subscription) {
      return res.status(200).json({
        message: 'No active subscription found',
        data: null
      });
    }

    return res.status(200).json({
      message: 'Subscription retrieved successfully',
      data: subscription
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Create a new subscription
 * POST /api/subscriptions/organizations/:orgId/subscribe
 * Body: { planId, autoRenew }
 */
export const subscribe = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { planId, autoRenew = true } = req.body;

    if (!planId) {
      return next(new AppError('Plan ID is required', 400));
    }

    // Verify plan exists
    await getPlanById(parseInt(planId));

    // Create subscription
    const subscription = await createSubscription(
      parseInt(orgId),
      parseInt(planId),
      autoRenew
    );

    return res.status(201).json({
      message: 'Subscription created successfully',
      data: subscription
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Cancel a subscription
 * DELETE /api/subscriptions/:subscriptionId
 */
export const cancel = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await cancelSubscription(parseInt(subscriptionId));

    return res.status(200).json({
      message: 'Subscription cancelled successfully',
      data: subscription
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Record a payment
 * POST /api/subscriptions/payments
 * Body: { organizationId, subscriptionId, amount, paymentMethod, status }
 */
export const recordPaymentHandler = async (req, res, next) => {
  try {
    const { organizationId, subscriptionId, amount, paymentMethod, status } = req.body;

    if (!organizationId || !amount || !paymentMethod) {
      return next(new AppError('organizationId, amount, and paymentMethod are required', 400));
    }

    const payment = await recordPayment(
      parseInt(organizationId),
      subscriptionId ? parseInt(subscriptionId) : null,
      parseFloat(amount),
      paymentMethod,
      status || 'SUCCESS'
    );

    return res.status(201).json({
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get payment history for an organization
 * GET /api/subscriptions/organizations/:orgId/payments
 */
export const getOrgPayments = async (req, res, next) => {
  try {
    const { orgId } = req.params;

    const payments = await getPaymentHistory(parseInt(orgId));

    return res.status(200).json({
      message: 'Payment history retrieved successfully',
      data: payments
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Check if organization has active subscription
 * GET /api/subscriptions/organizations/:orgId/active
 */
export const checkActive = async (req, res, next) => {
  try {
    const { orgId } = req.params;

    const isActive = await isSubscriptionActive(parseInt(orgId));

    return res.status(200).json({
      message: 'Subscription status checked',
      data: { isActive }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get subscription limits for organization
 * GET /api/subscriptions/organizations/:orgId/limits
 */
export const getOrgLimits = async (req, res, next) => {
  try {
    const { orgId } = req.params;

    const limits = await getSubscriptionLimits(parseInt(orgId));

    if (!limits) {
      return res.status(200).json({
        message: 'No active subscription found',
        data: null
      });
    }

    return res.status(200).json({
      message: 'Subscription limits retrieved',
      data: limits
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get the current user's organization plan features
 * GET /api/subscriptions/my-features
 * Useful for diagnosing "Feature not available" errors
 */
export const getMyFeatures = async (req, res, next) => {
  try {
    const orgId = await resolveOrganizationIdFromUser(req.user);

    if (!orgId) {
      return res.status(400).json({ message: 'Cannot resolve organization from your account' });
    }

    const catalog = await getSubscriptionFeatureCatalog(orgId);

    if (!catalog) {
      const sub = await getOrganizationSubscription(orgId);
      return res.status(200).json({
        message: 'No active subscription found for your organization',
        organizationId: orgId,
        subscription: sub
          ? { id: sub.id, planId: sub.planId, status: sub.status, endDate: sub.endDate }
          : null,
        features: [],
      });
    }

    const now = new Date();
    const isExpired = catalog.expiresAt ? new Date(catalog.expiresAt) <= now : false;

    return res.status(200).json({
      message: 'Feature catalog retrieved',
      organizationId: orgId,
      subscriptionId: catalog.subscriptionId,
      planId: catalog.planId,
      planName: catalog.planName,
      status: catalog.status,
      expiresAt: catalog.expiresAt,
      isExpired,
      featureCount: catalog.features.length,
      features: catalog.features.map((f) => f.featureKey),
    });
  } catch (error) {
    return next(error);
  }
};
