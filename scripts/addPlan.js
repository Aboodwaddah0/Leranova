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
  // NOTE: for a full reset with plan_feature relations use `npm run plan:seed` (resetPlans.js).
  // This function only creates the basic plan rows (legacy features JSON).
  const defaults = [
    {
      name: 'Academy Starter',
      price: 49,
      days: 30,
      description: 'Perfect for small academies getting started. Core LMS tools, basic quiz generation, and group chat for up to 50 students.',
      features: ['Course Management', 'Lesson Management', 'Student Enrollment', 'Quiz Generation', 'Progress Tracking', 'Group Chat'],
    },
    {
      name: 'Academy Pro',
      price: 99,
      days: 30,
      description: 'Designed for growing academies that need more powerful learning tools. Includes everything in Academy Starter, plus AI Chat, Notifications, and Analytics.',
      features: ['Course Management', 'Lesson Management', 'Student Enrollment', 'Quiz Generation', 'Progress Tracking', 'Group Chat', 'AI Chat', 'Notifications', 'Analytics'],
    },
    {
      name: 'School Edition',
      price: 199,
      days: 30,
      description: 'Built specifically for schools. Everything in Academy Pro, plus school-exclusive tools: attendance tracking, parent portal, school calendar, and grade reports.',
      features: ['Course Management', 'Lesson Management', 'Student Enrollment', 'Quiz Generation', 'Progress Tracking', 'Group Chat', 'AI Chat', 'Notifications', 'Analytics', 'Attendance Tracking', 'Parent Portal', 'School Calendar', 'Grade Reports', 'Parent Notifications', 'Class Management', 'Academic Years & Terms', 'Timetable Management'],
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
