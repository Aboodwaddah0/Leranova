import 'dotenv/config';
import prisma from '../src/utils/prisma.js';

const PLAN_FEATURE_KEYS = {
  Starter: ['GROUP_CHAT', 'NOTIFICATIONS'],
  Growth: ['AI_CHAT', 'GROUP_CHAT', 'NOTIFICATIONS', 'ANALYTICS'],
  Enterprise: ['AI_CHAT', 'GROUP_CHAT', 'NOTIFICATIONS', 'ANALYTICS', 'REPORTS', 'MAX_USERS'],
};

try {
  for (const [planName, featureKeys] of Object.entries(PLAN_FEATURE_KEYS)) {
    const plan = await prisma.plan.findFirst({ where: { name: planName }, select: { id: true, name: true } });
    if (!plan) continue;

    await prisma.plan.update({
      where: { id: plan.id },
      data: { features: featureKeys },
    });

    for (const featureKey of featureKeys) {
      const feature = await prisma.feature.findUnique({ where: { featureKey }, select: { id: true } });
      if (!feature) continue;

      await prisma.plan_feature.upsert({
        where: {
          planId_featureId: {
            planId: plan.id,
            featureId: feature.id,
          },
        },
        update: {},
        create: {
          planId: plan.id,
          featureId: feature.id,
          featureLimit: null,
        },
      });
    }
  }

  console.log('Plan feature keys fixed successfully.');
  await prisma.$disconnect();
} catch (error) {
  console.error(error);
  process.exit(1);
}
