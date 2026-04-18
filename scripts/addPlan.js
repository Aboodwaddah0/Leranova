import 'dotenv/config';
import prisma from '../src/utils/prisma.js';

const parseArgs = (argv) => {
  const args = {};

  for (const rawArg of argv) {
    if (!rawArg.startsWith('--')) continue;

    const arg = rawArg.slice(2);
    const [key, ...rest] = arg.split('=');
    const value = rest.join('=');

    args[key] = value === '' ? true : value;
  }

  return args;
};

const printUsage = () => {
  console.log(`\nUsage:\n  node scripts/addPlan.js --name=Basic --price=99.99 --days=30 [--description="..."] [--features="f1,f2"]\n  node scripts/addPlan.js --seed-defaults\n\nExamples:\n  node scripts/addPlan.js --name=Starter --price=49 --days=30 --features="Chatbot,Assignments"\n  node scripts/addPlan.js --seed-defaults\n`);
};

const toFeaturesArray = (featuresRaw) => {
  if (!featuresRaw) return [];

  return String(featuresRaw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const createSinglePlan = async ({ name, price, days, description, features }) => {
  if (!name) {
    throw new Error('Missing --name');
  }

  const parsedPrice = Number(price);
  const parsedDays = Number(days);

  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw new Error('Invalid --price. Use a non-negative number.');
  }

  if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
    throw new Error('Invalid --days. Use a positive integer.');
  }

  const existing = await prisma.plan.findFirst({
    where: { name },
    select: { id: true, name: true },
  });

  if (existing) {
    console.log(`Plan already exists: ${existing.name} (id=${existing.id})`);
    return existing;
  }

  const created = await prisma.plan.create({
    data: {
      name,
      price: parsedPrice,
      durationDays: parsedDays,
      description: description || null,
      features,
    },
    select: {
      id: true,
      name: true,
      price: true,
      durationDays: true,
      features: true,
    },
  });

  console.log(`Created plan: ${created.name} (id=${created.id})`);
  return created;
};

const seedDefaultPlans = async () => {
  const defaults = [
    {
      name: 'Starter',
      price: 49,
      days: 30,
      description: 'Starter monthly plan',
      features: ['GROUP_CHAT', 'NOTIFICATIONS'],
    },
    {
      name: 'Growth',
      price: 129,
      days: 30,
      description: 'Growth monthly plan',
      features: ['AI_CHAT', 'GROUP_CHAT', 'NOTIFICATIONS', 'ANALYTICS'],
    },
    {
      name: 'Enterprise',
      price: 999,
      days: 365,
      description: 'Enterprise annual plan',
      features: ['AI_CHAT', 'GROUP_CHAT', 'NOTIFICATIONS', 'ANALYTICS', 'REPORTS', 'MAX_USERS'],
    },
  ];

  for (const plan of defaults) {
    await createSinglePlan(plan);
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printUsage();
    return;
  }

  if (args['seed-defaults']) {
    await seedDefaultPlans();
    return;
  }

  await createSinglePlan({
    name: args.name,
    price: args.price,
    days: args.days,
    description: args.description,
    features: toFeaturesArray(args.features),
  });
};

main()
  .catch((error) => {
    console.error('Failed to add plan:', error.message);
    printUsage();
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
