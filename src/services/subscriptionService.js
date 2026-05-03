import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const featureSelect = {
  id: true,
  featureKey: true,
  name: true,
  description: true,
  hasLimit: true,
  defaultLimit: true,
};

const normalizeFeatureKey = (value) => String(value ?? '').trim().toUpperCase();

const buildPlanFeatureList = async (plan) => {
  const featureMap = new Map();

  for (const planFeature of plan?.planFeatures ?? []) {
    const featureKey = normalizeFeatureKey(planFeature?.feature?.featureKey);

    if (!featureKey) {
      continue;
    }

    featureMap.set(featureKey, {
      featureKey,
      name: planFeature.feature?.name ?? featureKey,
      description: planFeature.feature?.description ?? null,
      hasLimit: Boolean(planFeature.feature?.hasLimit),
      limit: planFeature.featureLimit ?? planFeature.feature?.defaultLimit ?? null,
      enabled: true,
      source: 'plan_feature',
    });
  }

  const legacyFeatureKeys = Array.isArray(plan?.features)
    ? plan.features
        .map((item) => {
          if (typeof item === 'string') {
            return normalizeFeatureKey(item);
          }

          if (item && typeof item === 'object') {
            return normalizeFeatureKey(item.featureKey ?? item.key ?? item.name);
          }

          return '';
        })
        .filter(Boolean)
    : [];

  if (legacyFeatureKeys.length > 0) {
    const legacyFeatures = await prisma.feature.findMany({
      where: {
        featureKey: {
          in: legacyFeatureKeys,
        },
      },
      select: featureSelect,
    });

    const legacyFeatureMap = new Map(
      legacyFeatures.map((feature) => [normalizeFeatureKey(feature.featureKey), feature])
    );

    for (const featureKey of legacyFeatureKeys) {
      if (featureMap.has(featureKey)) {
        continue;
      }

      const feature = legacyFeatureMap.get(featureKey);

      featureMap.set(featureKey, {
        featureKey,
        name: feature?.name ?? featureKey,
        description: feature?.description ?? null,
        hasLimit: Boolean(feature?.hasLimit),
        limit: feature?.defaultLimit ?? null,
        enabled: true,
        source: 'legacy_features_json',
      });
    }
  }

  return Array.from(featureMap.values());
};

/**
 * Get all active plans
 */
export const getAllPlans = async () => {
  const plans = await prisma.plan.findMany({
    orderBy: { price: 'asc' },
    include: {
      planFeatures: {
        include: {
          feature: true,
        },
      },
    },
  });
  return plans;
};

/**
 * Get a single plan by ID
 */
export const getPlanById = async (planId) => {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      planFeatures: {
        include: {
          feature: true,
        },
      },
    },
  });

  if (!plan) {
    throw new AppError('Plan not found', 404);
  }

  return plan;
};

/**
 * Get active subscription for an organization.
 * Accepts ACTIVE status first; falls back to any non-cancelled, non-expired subscription
 * so that PENDING subscriptions with a future endDate are treated as valid.
 */
export const getOrganizationSubscription = async (organizationId) => {
  const include = {
    plan: {
      include: {
        planFeatures: {
          include: { feature: true },
        },
      },
    },
  };

  const active = await prisma.subscription.findFirst({
    where: { organizationId, status: 'ACTIVE' },
    include,
  });

  if (active) return active;

  // Fallback: any non-cancelled subscription that hasn't expired yet
  const now = new Date();
  return prisma.subscription.findFirst({
    where: {
      organizationId,
      status: { notIn: ['CANCELLED', 'EXPIRED'] },
      OR: [{ endDate: null }, { endDate: { gt: now } }],
    },
    include,
    orderBy: { id: 'desc' },
  });
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

  // Calculate end date based on plan duration (null durationDays = lifetime)
  const startDate = new Date();
  const durationDays = Number(plan.durationDays);
  const endDate = Number.isFinite(durationDays) && durationDays > 0
    ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + durationDays)
    : null;

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
      plan: {
        include: {
          planFeatures: {
            include: {
              feature: true,
            },
          },
        },
      }
    }
  });

  return subscription;
};

/**
 * Check if subscription is still valid.
 * Uses getOrganizationSubscription so PENDING-but-not-expired subscriptions count.
 */
export const isSubscriptionActive = async (organizationId) => {
  const subscription = await getOrganizationSubscription(organizationId);

  if (!subscription) {
    return false;
  }

  // null endDate = lifetime / no expiry
  if (!subscription.endDate) {
    return true;
  }

  return new Date(subscription.endDate) > new Date();
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
    expiresAt: subscription.endDate,
    features: await buildPlanFeatureList(subscription.plan)
  };
};
