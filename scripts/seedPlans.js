import 'dotenv/config';
import prisma from '../src/utils/prisma.js';

/* ─────────────────────────────────────────────────────────
   FEATURES
───────────────────────────────────────────────────────── */
const FEATURES = [
  // ── Core (all plans) ──────────────────────────────────
  { featureKey: 'COURSE_MANAGEMENT',  name: 'Course Management',     description: 'Create and manage courses with full content control' },
  { featureKey: 'LESSON_MANAGEMENT',  name: 'Lesson Management',     description: 'Build lessons with video, PDF, text, and audio attachments' },
  { featureKey: 'STUDENT_ENROLLMENT', name: 'Student Enrollment',    description: 'Enroll and manage students in courses', hasLimit: true, defaultLimit: 50 },
  { featureKey: 'QUIZ_GENERATION',    name: 'Quiz Generation',       description: 'AI-generated quizzes from lesson content' },
  { featureKey: 'PROGRESS_TRACKING',  name: 'Progress Tracking',     description: 'Track student progress and completion across lessons' },
  { featureKey: 'GROUP_CHAT',         name: 'Group Chat',            description: 'Course-level group chat for all enrolled participants' },

  // ── Pro (Academy Pro + School Edition) ────────────────
  { featureKey: 'AI_MENTOR',          name: 'AI Mentor',             description: 'RAG-powered AI tutor grounded in your lesson content' },
  { featureKey: 'SMART_FLASHCARDS',   name: 'Smart Flashcards',      description: 'Auto-generated flashcards from lesson material' },
  { featureKey: 'MIND_MAPS',          name: 'Mind Maps',             description: 'Visual concept maps auto-generated from lessons' },
  { featureKey: 'GAMIFICATION',       name: 'Gamification',          description: 'XP points, daily streaks, achievements, and level-ups' },
  { featureKey: 'LEADERBOARDS',       name: 'Leaderboards',          description: 'Live rankings driving healthy student competition' },
  { featureKey: 'ADVANCED_ANALYTICS', name: 'Advanced Analytics',    description: 'Real-time dashboards and performance insights for instructors' },
  { featureKey: 'DIRECT_MESSAGING',   name: 'Direct Messaging',      description: 'Private chat between teachers and students' },
  { featureKey: 'NOTIFICATIONS',      name: 'Push Notifications',    description: 'In-app and Firebase push notifications' },

  // ── School-only ───────────────────────────────────────
  { featureKey: 'ATTENDANCE_TRACKING',   name: 'Attendance Tracking',      description: 'Daily and subject-level attendance with automated reports' },
  { featureKey: 'PARENT_PORTAL',         name: 'Parent Portal',            description: 'Parents track grades, attendance, and child progress in real time' },
  { featureKey: 'SCHOOL_CALENDAR',       name: 'School Calendar',          description: 'Events and exam schedules visible to all roles' },
  { featureKey: 'GRADE_REPORTS',         name: 'Grade Reports',            description: 'Comprehensive grade reports exportable to Excel' },
  { featureKey: 'PARENT_NOTIFICATIONS',  name: 'Parent Notifications',     description: 'Instant push alerts to parents for absences and grades' },
  { featureKey: 'CLASS_MANAGEMENT',      name: 'Class Management',         description: 'Classes, sections, and schedules in one workspace' },
  { featureKey: 'ACADEMIC_YEARS',        name: 'Academic Years & Terms',   description: 'Full academic year and term lifecycle management' },
  { featureKey: 'TIMETABLE',             name: 'Timetable Management',     description: 'Weekly timetable scheduling for classes and subjects' },
];

/* ─────────────────────────────────────────────────────────
   PLANS
───────────────────────────────────────────────────────── */
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
    description: 'Full AI-powered learning for growing academies. Unlimited students, AI mentor, gamification, advanced analytics, and push notifications.',
    featureKeys: [
      'COURSE_MANAGEMENT',
      'LESSON_MANAGEMENT',
      'STUDENT_ENROLLMENT',
      'QUIZ_GENERATION',
      'PROGRESS_TRACKING',
      'GROUP_CHAT',
      'AI_MENTOR',
      'SMART_FLASHCARDS',
      'MIND_MAPS',
      'GAMIFICATION',
      'LEADERBOARDS',
      'ADVANCED_ANALYTICS',
      'DIRECT_MESSAGING',
      'NOTIFICATIONS',
    ],
    featureLimits: {},
  },
  {
    name: 'School Edition',
    price: 199,
    durationDays: 30,
    description: 'Everything in Academy Pro plus school-exclusive tools: attendance tracking, parent portal, grade reports, school calendar, and real-time parent push notifications.',
    featureKeys: [
      'COURSE_MANAGEMENT',
      'LESSON_MANAGEMENT',
      'STUDENT_ENROLLMENT',
      'QUIZ_GENERATION',
      'PROGRESS_TRACKING',
      'GROUP_CHAT',
      'AI_MENTOR',
      'SMART_FLASHCARDS',
      'MIND_MAPS',
      'GAMIFICATION',
      'LEADERBOARDS',
      'ADVANCED_ANALYTICS',
      'DIRECT_MESSAGING',
      'NOTIFICATIONS',
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
    featureLimits: {},
  },
];

/* ─────────────────────────────────────────────────────────
   SEED
───────────────────────────────────────────────────────── */
async function seed() {
  console.log('🌱  Seeding features...');

  // Upsert all features
  const featureMap = {};
  for (const f of FEATURES) {
    const record = await prisma.feature.upsert({
      where:  { featureKey: f.featureKey },
      update: { name: f.name, description: f.description ?? null, hasLimit: f.hasLimit ?? false, defaultLimit: f.defaultLimit ?? null },
      create: { featureKey: f.featureKey, name: f.name, description: f.description ?? null, hasLimit: f.hasLimit ?? false, defaultLimit: f.defaultLimit ?? null },
    });
    featureMap[f.featureKey] = record.id;
    console.log(`   ✓ feature: ${f.featureKey}`);
  }

  console.log('\n🌱  Seeding plans...');

  for (const p of PLANS) {
    // Build legacy features Json array (for PlanSelector.jsx backwards compat)
    const legacyFeatures = p.featureKeys;

    // Find-or-create plan by name
    let plan = await prisma.plan.findFirst({ where: { name: p.name } });
    if (plan) {
      plan = await prisma.plan.update({
        where: { id: plan.id },
        data:  { price: p.price, durationDays: p.durationDays, description: p.description, features: legacyFeatures },
      });
    } else {
      plan = await prisma.plan.create({
        data: { name: p.name, price: p.price, durationDays: p.durationDays, description: p.description, features: legacyFeatures },
      });
    }
    console.log(`   ✓ plan: ${p.name} ($${p.price}/mo)`);

    // Clear existing plan_feature rows then re-assign
    await prisma.plan_feature.deleteMany({ where: { planId: plan.id } });

    for (const key of p.featureKeys) {
      const featureId = featureMap[key];
      const limit     = p.featureLimits?.[key] ?? null;
      await prisma.plan_feature.create({
        data: { planId: plan.id, featureId, featureLimit: limit },
      });
    }
    console.log(`      → ${p.featureKeys.length} features assigned`);
  }

  console.log('\n✅  Done.');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
