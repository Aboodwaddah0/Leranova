import 'dotenv/config';
import prisma from '../src/utils/prisma.js';

try {
  const academyOrg = await prisma.organization.findUnique({
    where: { Email: 'academy@learnova.com' },
    select: { id: true, Name: true, status: true },
  });

  const features = await prisma.feature.findMany({
    select: { id: true, featureKey: true, name: true },
    orderBy: { id: 'asc' },
  });

  const plans = await prisma.plan.findMany({
    include: {
      planFeatures: {
        include: { feature: { select: { featureKey: true, name: true } } },
      },
    },
    orderBy: { id: 'asc' },
  });

  const subs = await prisma.subscription.findMany({
    where: { organizationId: academyOrg?.id },
    include: { plan: { select: { id: true, name: true } } },
    orderBy: { id: 'desc' },
  });

  console.log(JSON.stringify({
    academyOrg,
    features,
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      features: p.planFeatures.map((pf) => pf.feature?.featureKey),
    })),
    academySubscriptions: subs.map((s) => ({
      id: s.id,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      plan: s.plan,
    })),
  }, null, 2));

  await prisma.$disconnect();
} catch (error) {
  console.error(error);
  process.exit(1);
}
