import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { getOrganizationSubscription, isSubscriptionActive } from './subscriptionService.js';

const normalizeFeatureKey = (value) => String(value ?? '').trim().toUpperCase();

const resolveOrganizationIdFromUser = async (tokenUser) => {
  const directOrgId = Number(tokenUser?.orgId ?? tokenUser?.organizationId ?? tokenUser?.OrgId ?? tokenUser?.Org_id);

  if (Number.isInteger(directOrgId) && directOrgId > 0) {
    return directOrgId;
  }

  const userId = Number(tokenUser?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const role = String(tokenUser?.role ?? '').trim().toUpperCase();

  if (role === 'ACADEMY' || role === 'SCHOOL') {
    return userId;
  }

  if (role === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { Teacher_id: userId },
      select: { OrgId: true },
    });

    return teacher?.OrgId ?? null;
  }

  if (role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { Student_id: userId },
      select: { OrgId: true },
    });

    if (student?.OrgId) {
      return student.OrgId;
    }

    const academyStudent = await prisma.academy_user.findUnique({
      where: { user_academy_id: userId },
      select: { OrgId: true },
    });

    return academyStudent?.OrgId ?? null;
  }

  const academyUser = await prisma.academy_user.findUnique({
    where: { user_academy_id: userId },
    select: { OrgId: true },
  });

  if (academyUser?.OrgId) {
    return academyUser.OrgId;
  }

  return null;
};

const buildFeatureCatalog = async (plan) => {
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
      select: {
        id: true,
        featureKey: true,
        name: true,
        description: true,
        hasLimit: true,
        defaultLimit: true,
      },
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

export const getSubscriptionFeatureCatalog = async (organizationId) => {
  const subscription = await getOrganizationSubscription(organizationId);

  if (!subscription) {
    return null;
  }

  return {
    subscriptionId: subscription.id,
    planId: subscription.planId,
    planName: subscription.plan.name,
    status: subscription.status,
    expiresAt: subscription.endDate,
    features: await buildFeatureCatalog(subscription.plan),
  };
};

export const checkFeatureAccess = async (organizationId, featureKey) => {
  const normalizedFeatureKey = normalizeFeatureKey(featureKey);

  if (!Number.isInteger(Number(organizationId)) || Number(organizationId) <= 0) {
    throw new AppError('Valid organizationId is required', 400);
  }

  if (!normalizedFeatureKey) {
    throw new AppError('Feature key is required', 400);
  }

  const subscription = await getOrganizationSubscription(Number(organizationId));

  if (!subscription) {
    return {
      allowed: false,
      reason: 'no_active_subscription',
      featureKey: normalizedFeatureKey,
      subscription: null,
    };
  }

  const active = await isSubscriptionActive(Number(organizationId));

  if (!active) {
    return {
      allowed: false,
      reason: 'subscription_expired',
      featureKey: normalizedFeatureKey,
      subscriptionId: subscription.id,
      planId: subscription.planId,
    };
  }

  const features = await buildFeatureCatalog(subscription.plan);

  // If the plan has no feature restrictions configured, allow everything
  if (features.length === 0) {
    return {
      allowed: true,
      reason: null,
      featureKey: normalizedFeatureKey,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      planName: subscription.plan.name,
      feature: { featureKey: normalizedFeatureKey, enabled: true, hasLimit: false, limit: null },
    };
  }

  const matchedFeature = features.find((feature) => feature.featureKey === normalizedFeatureKey);

  if (!matchedFeature) {
    return {
      allowed: false,
      reason: 'feature_not_in_plan',
      featureKey: normalizedFeatureKey,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      planName: subscription.plan.name,
    };
  }

  return {
    allowed: true,
    reason: null,
    featureKey: normalizedFeatureKey,
    subscriptionId: subscription.id,
    planId: subscription.planId,
    planName: subscription.plan.name,
    feature: matchedFeature,
  };
};

export const checkFeatureLimit = async (organizationId, featureKey, currentCount) => {
  const access = await checkFeatureAccess(organizationId, featureKey);

  if (!access.allowed) {
    return access;
  }

  const count = Number(currentCount);

  if (!Number.isFinite(count) || count < 0) {
    return {
      ...access,
      allowed: true,
      limitCheckSkipped: true,
    };
  }

  const limit = access.feature?.limit;

  if (limit === null || limit === undefined) {
    return {
      ...access,
      currentCount: count,
      limit: null,
      withinLimit: true,
    };
  }

  const withinLimit = count < Number(limit);

  return {
    ...access,
    currentCount: count,
    limit: Number(limit),
    withinLimit,
    allowed: withinLimit,
    reason: withinLimit ? null : 'feature_limit_exceeded',
  };
};

export { resolveOrganizationIdFromUser };
