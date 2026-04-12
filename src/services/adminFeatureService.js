import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const normalizeFeatureKey = (value) => String(value ?? '').trim().toUpperCase();

const featureSelect = {
  id: true,
  featureKey: true,
  name: true,
  description: true,
  hasLimit: true,
  defaultLimit: true,
  createdAt: true,
  updatedAt: true,
};

const planFeatureSelect = {
  id: true,
  planId: true,
  featureId: true,
  featureLimit: true,
  createdAt: true,
  updatedAt: true,
  feature: {
    select: featureSelect,
  },
};

const ensurePlanExists = async (planId) => {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, name: true },
  });

  if (!plan) {
    throw new AppError('Plan not found', 404);
  }

  return plan;
};

const ensureFeatureExists = async (featureId) => {
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    select: featureSelect,
  });

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  return feature;
};

export const listFeatures = async () => {
  return prisma.feature.findMany({
    orderBy: [{ featureKey: 'asc' }],
    select: featureSelect,
  });
};

export const getFeatureById = async (featureId) => {
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    select: featureSelect,
  });

  if (!feature) {
    throw new AppError('Feature not found', 404);
  }

  return feature;
};

export const createFeature = async (data) => {
  const featureKey = normalizeFeatureKey(data.featureKey);

  const existing = await prisma.feature.findUnique({
    where: { featureKey },
    select: { id: true },
  });

  if (existing) {
    throw new AppError('Feature key already exists', 400);
  }

  return prisma.feature.create({
    data: {
      featureKey,
      name: data.name,
      description: data.description ?? null,
      hasLimit: Boolean(data.hasLimit),
      defaultLimit: data.defaultLimit ?? null,
    },
    select: featureSelect,
  });
};

export const updateFeature = async (featureId, data) => {
  await getFeatureById(featureId);

  const payload = { ...data };

  if (payload.featureKey) {
    payload.featureKey = normalizeFeatureKey(payload.featureKey);

    const existing = await prisma.feature.findFirst({
      where: {
        featureKey: payload.featureKey,
        NOT: { id: featureId },
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppError('Feature key already exists', 400);
    }
  }

  return prisma.feature.update({
    where: { id: featureId },
    data: payload,
    select: featureSelect,
  });
};

export const deleteFeature = async (featureId) => {
  await getFeatureById(featureId);

  await prisma.feature.delete({
    where: { id: featureId },
  });

  return { id: featureId };
};

export const listPlanFeatures = async (planId) => {
  const plan = await ensurePlanExists(planId);

  const features = await prisma.plan_feature.findMany({
    where: { planId },
    orderBy: [{ featureId: 'asc' }],
    select: planFeatureSelect,
  });

  return {
    plan,
    features,
  };
};

export const assignFeatureToPlan = async (planId, data) => {
  await ensurePlanExists(planId);
  await ensureFeatureExists(data.featureId);

  const existing = await prisma.plan_feature.findFirst({
    where: {
      planId,
      featureId: data.featureId,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.plan_feature.update({
      where: { id: existing.id },
      data: {
        featureLimit: data.featureLimit ?? null,
      },
      select: planFeatureSelect,
    });
  }

  return prisma.plan_feature.create({
    data: {
      planId,
      featureId: data.featureId,
      featureLimit: data.featureLimit ?? null,
    },
    select: planFeatureSelect,
  });
};

export const updatePlanFeature = async (planId, featureId, data) => {
  await ensurePlanExists(planId);
  await ensureFeatureExists(featureId);

  const existing = await prisma.plan_feature.findFirst({
    where: {
      planId,
      featureId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('Feature is not assigned to this plan', 404);
  }

  return prisma.plan_feature.update({
    where: { id: existing.id },
    data: {
      featureLimit: data.featureLimit ?? null,
    },
    select: planFeatureSelect,
  });
};

export const removePlanFeature = async (planId, featureId) => {
  await ensurePlanExists(planId);

  const existing = await prisma.plan_feature.findFirst({
    where: {
      planId,
      featureId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new AppError('Feature is not assigned to this plan', 404);
  }

  await prisma.plan_feature.delete({
    where: { id: existing.id },
  });

  return {
    planId,
    featureId,
  };
};
