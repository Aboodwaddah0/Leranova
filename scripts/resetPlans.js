import 'dotenv/config';
import prisma from '../src/utils/prisma.js';

/* ─── Feature definitions ───────────────────────────────── */
const FEATURES = [
  { featureKey: 'COURSE_MANAGEMENT',   name: 'Course Management',       description: 'Create and manage courses with full content control' },
  { featureKey: 'LESSON_MANAGEMENT',   name: 'Lesson Management',        description: 'Build lessons with video, PDF, text, and audio attachments' },
  { featureKey: 'STUDENT_ENROLLMENT',  name: 'Student Enrollment',       description: 'Enroll and manage students in courses', hasLimit: true, defaultLimit: 50 },
  { featureKey: 'QUIZ_GENERATION',     name: 'Quiz Generation',          description: 'AI-generated quizzes from lesson content' },
  { featureKey: 'PROGRESS_TRACKING',   name: 'Progress Tracking',        description: 'Track student progress and completion across lessons' },
  { featureKey: 'GROUP_CHAT',          name: 'Group Chat',               description: 'Course-level group chat for all enrolled participants' },
  { featureKey: 'NOTIFICATIONS',       name: 'Notifications',            description: 'In-app and Firebase push notifications' },
  { featureKey: 'AI_CHAT',             name: 'AI Chat',                  description: 'RAG-powered AI tutor grounded in your lesson content' },
  { featureKey: 'ADVANCED_ANALYTICS',  name: 'Analytics',                description: 'Real-time dashboards and performance insights' },
  { featureKey: 'GRADE_REPORTS',       name: 'Reports',                  description: 'Comprehensive grade reports exportable to Excel' },
  { featureKey: 'UNLIMITED_USERS',     name: 'Max Users',                description: 'Unlimited student capacity across all courses' },
  { featureKey: 'ATTENDANCE_TRACKING', name: 'Attendance Tracking',      description: 'Daily and subject-level attendance with automated reports' },
  { featureKey: 'PARENT_PORTAL',       name: 'Parent Portal',            description: 'Parents track grades, attendance, and child progress in real time' },
  { featureKey: 'SCHOOL_CALENDAR',     name: 'School Calendar',          description: 'Events and exam schedules visible to all roles' },
  { featureKey: 'PARENT_NOTIFICATIONS',name: 'Parent Notifications',     description: 'Instant push alerts to parents for absences and grades' },
  { featureKey: 'CLASS_MANAGEMENT',    name: 'Class Management',         description: 'Classes, sections, and schedules in one workspace' },
  { featureKey: 'ACADEMIC_YEARS',      name: 'Academic Years & Terms',   description: 'Full academic year and term lifecycle management' },
  { featureKey: 'TIMETABLE',           name: 'Timetable Management',     description: 'Weekly timetable scheduling for classes and subjects' },
];

/* ─── Plan definitions (exactly as requested) ───────────── */
const PLANS = [
  {
    name: 'Academy Starter',
    price: 49,
    durationDays: 30,
    description: 'Perfect for small academies getting started. Core LMS tools, basic quiz generation, and group chat for up to 50 students.',
    featureKeys: [
      'COURSE_MANAGEMENT',
      'LESSON_MANAGEMENT',
      'STUDENT_ENROLLMENT',
      'QUIZ_GENERATION',
      'PROGRESS_TRACKING',
      'GROUP_CHAT',
    ],
    featureLimits: { STUDENT_ENROLLMENT: 50 },
  },
  {
    name: 'Academy Pro',
    price: 99,
    durationDays: 30,
    description: 'Designed for growing academies that need more powerful learning tools. Everything in Academy Starter, plus AI chat, notifications, and analytics.',
    featureKeys: [
      'COURSE_MANAGEMENT',
      'LESSON_MANAGEMENT',
      'STUDENT_ENROLLMENT',
      'QUIZ_GENERATION',
      'PROGRESS_TRACKING',
      'GROUP_CHAT',
      'AI_CHAT',
      'NOTIFICATIONS',
      'ADVANCED_ANALYTICS',
    ],
  },
  {
    name: 'School Edition',
    price: 199,
    durationDays: 30,
    description: 'Built specifically for schools. Everything in Academy Pro, plus school-exclusive tools: attendance tracking, parent portal, school calendar, and grade reports.',
    featureKeys: [
      'COURSE_MANAGEMENT',
      'LESSON_MANAGEMENT',
      'STUDENT_ENROLLMENT',
      'QUIZ_GENERATION',
      'PROGRESS_TRACKING',
      'GROUP_CHAT',
      'AI_CHAT',
      'NOTIFICATIONS',
      'ADVANCED_ANALYTICS',
      // School-only ↓
      'ATTENDANCE_TRACKING',
      'PARENT_PORTAL',
      'SCHOOL_CALENDAR',
      'GRADE_REPORTS',
      'PARENT_NOTIFICATIONS',
      'CLASS_MANAGEMENT',
      'ACADEMIC_YEARS',
      'TIMETABLE',
    ],
  },
];

/* ─── Seed ──────────────────────────────────────────────── */
async function seed() {
  // 1. Upsert all features
  console.log('🌱  Upserting features...');
  const featureMap = {};
  for (const f of FEATURES) {
    const record = await prisma.feature.upsert({
      where:  { featureKey: f.featureKey },
      update: { name: f.name, description: f.description ?? null, hasLimit: f.hasLimit ?? false, defaultLimit: f.defaultLimit ?? null },
      create: { featureKey: f.featureKey, name: f.name, description: f.description ?? null, hasLimit: f.hasLimit ?? false, defaultLimit: f.defaultLimit ?? null },
    });
    featureMap[f.featureKey] = record.id;
    console.log(`   ✓ ${f.featureKey}`);
  }

  // 2. Delete ALL plan_features first (no FK issue)
  console.log('\n🗑   Clearing all plan_features...');
  await prisma.plan_feature.deleteMany({});

  // 3. Delete plans that have no subscriptions; update the rest
  console.log('🗑   Removing old plans...');
  const existingPlans = await prisma.plan.findMany({ include: { _count: { select: { subscriptions: true } } } });
  for (const p of existingPlans) {
    if (p._count.subscriptions === 0) {
      await prisma.plan.delete({ where: { id: p.id } });
      console.log(`   🗑 deleted: ${p.name}`);
    } else {
      console.log(`   ⚠ skipped (has subscriptions): ${p.name}`);
    }
  }

  // 4. Create / update plans
  console.log('\n🌱  Creating plans...');
  for (const p of PLANS) {
    // Store display names (not raw keys) so landing page and signup show identical text
    const legacyFeatures = p.featureKeys.map((key) => {
      const f = FEATURES.find((f) => f.featureKey === key);
      return f ? f.name : key;
    });

    let plan = await prisma.plan.findFirst({ where: { name: p.name } });
    if (plan) {
      plan = await prisma.plan.update({
        where: { id: plan.id },
        data:  { price: p.price, durationDays: p.durationDays, description: p.description, features: legacyFeatures },
      });
      console.log(`   ↺ updated: ${p.name}`);
    } else {
      plan = await prisma.plan.create({
        data: { name: p.name, price: p.price, durationDays: p.durationDays, description: p.description, features: legacyFeatures },
      });
      console.log(`   ✓ created: ${p.name} ($${p.price})`);
    }

    for (const key of p.featureKeys) {
      const featureId = featureMap[key];
      if (!featureId) { console.warn(`      ⚠ unknown feature key: ${key}`); continue; }
      const limit = p.featureLimits?.[key] ?? null;
      await prisma.plan_feature.create({ data: { planId: plan.id, featureId, featureLimit: limit } });
    }
    console.log(`      → ${p.featureKeys.length} features assigned`);
  }

  console.log('\n✅  Done.');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
