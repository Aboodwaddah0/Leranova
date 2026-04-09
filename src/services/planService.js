import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';

const planSelect = {
  id: true,
  name: true,
  price: true,
  durationDays: true,
  description: true,
  features: true,
  createdAt: true,
  updatedAt: true,
};

export const getPlans = async () => {
  return prisma.plan.findMany({
    orderBy: { id: 'asc' },
    select: planSelect,
  });
};

export const getPlanById = async (planId) => {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: planSelect,
  });

  if (!plan) {
    throw new AppError('Plan not found', 404);
  }

  return plan;
};

export const createPlan = async (data) => {
  const existingPlan = await prisma.plan.findFirst({
    where: {
      name: data.name,
    },
    select: { id: true },
  });

  if (existingPlan) {
    throw new AppError('Plan name already exists', 400);
  }

  return prisma.plan.create({
    data: {
      name: data.name,
      price: data.price,
      durationDays: data.durationDays,
      description: data.description ?? null,
      features: data.features ?? [],
    },
    select: planSelect,
  });
};

export const updatePlan = async (planId, data) => {
  await getPlanById(planId);

  if (data.name) {
    const existingPlan = await prisma.plan.findFirst({
      where: {
        name: data.name,
        NOT: { id: planId },
      },
      select: { id: true },
    });

    if (existingPlan) {
      throw new AppError('Plan name already exists', 400);
    }
  }

  return prisma.plan.update({
    where: { id: planId },
    data: {
      name: data.name,
      price: data.price,
      durationDays: data.durationDays,
      description: data.description,
      features: data.features,
    },
    select: planSelect,
  });
};

export const deletePlan = async (planId) => {
  await getPlanById(planId);

  await prisma.plan.delete({
    where: { id: planId },
  });

  return { id: planId };
};
