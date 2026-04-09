import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

/**
 * Get all active plans
 */
export const getAllPlans = async () => {
  const plans = await prisma.plan.findMany({
    orderBy: { price: 'asc' }
  });
  return plans;
};

/**
 * Get a single plan by ID
 */
export const getPlanById = async (planId) => {
  const plan = await prisma.plan.findUnique({
    where: { id: planId }
  });

  if (!plan) {
    throw new AppError('Plan not found', 404);
  }

  return plan;
};

/**
 * Get active subscription for an organization
 */
export const getOrganizationSubscription = async (organizationId) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: 'ACTIVE'
    },
    include: {
      plan: true
    }
  });

  return subscription;
};

/**
 * Create or activate a subscription
 */
export const createSubscription = async (organizationId, planId, autoRenew = true) => {
  // Verify plan exists
  const plan = await getPlanById(planId);

  // Check if there's an active subscription
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: 'ACTIVE'
    }
  });

  // If there's an active subscription, cancel it first
  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: { status: 'CANCELLED' }
    });
  }

  // Calculate end date based on plan duration
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  // Create new subscription
  const subscription = await prisma.subscription.create({
    data: {
      organizationId,
      planId,
      startDate,
      endDate,
      status: 'ACTIVE',
      autoRenew,
      organization: { connect: { id: organizationId } },
      plan: { connect: { id: planId } }
    },
    include: {
      plan: true
    }
  });

  return subscription;
};

/**
 * Check if subscription is still valid
 */
export const isSubscriptionActive = async (organizationId) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: 'ACTIVE'
    }
  });

  if (!subscription) {
    return false;
  }

  // Check if subscription hasn't expired
  const now = new Date();
  return subscription.endDate > now;
};

/**
 * Record a payment
 */
export const recordPayment = async (organizationId, subscriptionId, amount, paymentMethod, status = 'SUCCESS') => {
  const payment = await prisma.payment.create({
    data: {
      organizationId,
      subscriptionId,
      amount,
      paymentMethod,
      status,
      paymentDate: new Date()
    }
  });

  return payment;
};

/**
 * Get payment history for organization
 */
export const getPaymentHistory = async (organizationId) => {
  const payments = await prisma.payment.findMany({
    where: { organizationId },
    include: {
      subscription: {
        include: { plan: true }
      }
    },
    orderBy: { paymentDate: 'desc' }
  });

  return payments;
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (subscriptionId) => {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: 'CANCELLED' }
  });

  return subscription;
};

/**
 * Auto-renew expired subscriptions (if auto_renew is true)
 */
export const handleExpiredSubscriptions = async () => {
  const now = new Date();

  // Find expired subscriptions with auto_renew enabled
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      autoRenew: true,
      endDate: { lte: now }
    },
    include: { plan: true, organization: true }
  });

  const renewed = [];

  for (const subscription of expiredSubscriptions) {
    try {
      const newSubscription = await createSubscription(
        subscription.organizationId,
        subscription.planId,
        subscription.autoRenew
      );

      renewed.push(newSubscription);
    } catch (error) {
      console.error(
        `Failed to auto-renew subscription ${subscription.id}:`,
        error.message
      );
    }
  }

  return renewed;
};

/**
 * Check subscription limits for organization
 */
export const getSubscriptionLimits = async (organizationId) => {
  const subscription = await getOrganizationSubscription(organizationId);

  if (!subscription) {
    return null;
  }

  return {
    subscriptionId: subscription.id,
    planName: subscription.plan.name,
    planPrice: subscription.plan.price,
    durationDays: subscription.plan.durationDays,
    status: subscription.status,
    expiresAt: subscription.endDate
  };
};
