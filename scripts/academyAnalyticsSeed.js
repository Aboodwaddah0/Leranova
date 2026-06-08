/**
 * academyAnalyticsSeed.js — creates a fully self-contained ACADEMY org
 * ("NovaSpark Academy") with rich data AND the gamification data
 * (XP summaries, streaks, xp_events, quizzes + attempts) needed to make
 * the Instructor Analytics page (`GET /teachers/me/analytics`) render
 * meaningfully — none of the existing academy seeds populate that data.
 *
 * Idempotent — safe to re-run (upserts / find-or-create everywhere).
 *
 * Usage:
 *   docker exec learnova-api node scripts/academyAnalyticsSeed.js
 *
 * All accounts use password: Learnova@123
 */

import 'dotenv/config';
import prisma from '../src/utils/prisma.js';
import { hashPassword } from '../src/utils/hashPassword.js';
import { encryptPassword } from '../src/utils/passwordCrypto.js';

const PASSWORD = 'Learnova@123';
const ORG_CODE = 'NVSP';
const log = (msg) => console.log(`[ACADEMY-ANALYTICS] ${msg}`);
const daysAgo = (n, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const ensureUser = async ({ email, name, role, gender }) => {
  const passwordHashed = await hashPassword(PASSWORD);
  const passwordEncrypted = encryptPassword(PASSWORD);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { name, email, role, gender, passwordHashed, passwordEncrypted } });
};

const run = async () => {
  await prisma.$connect();
  log('Connected');

  // ── 1. Organization ─────────────────────────────────────────────────────────
  const orgPasswordHashed = await hashPassword(PASSWORD);
  let org = await prisma.organization.findUnique({ where: { Email: 'academy@novaspark.test' } });
  if (!org) {
    org = await prisma.organization.create({
      data: { Name: 'NovaSpark Academy', Email: 'academy@novaspark.test', Role: 'ACADEMY', status: 'APPROVED', Password_Hashed: orgPasswordHashed },
    });
  }
  const orgId = org.id;
  log(`Org: ${org.Name} (id=${orgId})`);

  // ── 2. Teachers ──────────────────────────────────────────────────────────────
  const teacherDefs = [
    { name: 'Ava Bennett', email: 'ava@novaspark.test', spec: 'Web Development', bio: 'Frontend specialist who loves teaching React and modern CSS', gender: 'FEMALE' },
    { name: 'Noah Carter', email: 'noah2@novaspark.test', spec: 'Data Science', bio: 'Data analyst turned educator, focuses on practical Python projects', gender: 'MALE' },
  ];
  const teachers = [];
  for (const td of teacherDefs) {
    const tUser = await ensureUser({ email: td.email, name: td.name, role: 'TEACHER', gender: td.gender });
    await prisma.teacher.upsert({
      where: { Teacher_id: tUser.id },
      update: { OrgId: orgId, specialization: td.spec, bio: td.bio },
      create: { Teacher_id: tUser.id, OrgId: orgId, specialization: td.spec, bio: td.bio },
    });
    teachers.push({ userId: tUser.id, ...td });
    log(`Teacher: ${td.name} (id=${tUser.id})`);
  }
  const [tWeb, tData] = teachers;

  // ── 3. Tracks ────────────────────────────────────────────────────────────────
  const trackDefs = [
    { name: 'Web Development Track', desc: 'From HTML basics to full-stack React & Node.js apps', teacherId: tWeb.userId },
    { name: 'Data Science Track', desc: 'Python, data analysis and intro machine learning', teacherId: tData.userId },
  ];
  const tracks = [];
  for (const td of trackDefs) {
    let track = await prisma.track.findFirst({ where: { Org_id: orgId, Name: td.name } });
    if (!track) {
      track = await prisma.track.create({
        data: { Org_id: orgId, Teacher_id: td.teacherId, Name: td.name, kind: 'TRACK', Description: td.desc, isPaid: false, price: 0 },
      });
    }
    tracks.push(track);
    log(`Track: ${td.name} (id=${track.id})`);
  }
  const [webTrack, dataTrack] = tracks;

  // ── 4. Subjects + lessons (5 subjects, 5-6 lessons each) ────────────────────
  const subjectDefs = [
    { trackId: webTrack.id, teacherId: tWeb.userId, name: 'HTML & CSS Fundamentals', desc: 'Build pages from scratch with semantic HTML and modern CSS', lessons: [
      'Introduction to HTML', 'CSS Selectors & Box Model', 'Flexbox Layouts', 'CSS Grid', 'Responsive Design', 'Forms & Accessibility',
    ] },
    { trackId: webTrack.id, teacherId: tWeb.userId, name: 'JavaScript Essentials', desc: 'Core JavaScript — variables, functions, DOM and async', lessons: [
      'Variables & Data Types', 'Functions & Scope', 'Arrays & Objects', 'DOM Manipulation', 'Events', 'Async/Await & Fetch',
    ] },
    { trackId: webTrack.id, teacherId: tWeb.userId, name: 'React.js', desc: 'Component-based UI development with hooks', lessons: [
      'Components & Props', 'State & useEffect', 'Forms & Lists', 'Routing', 'Consuming APIs',
    ] },
    { trackId: dataTrack.id, teacherId: tData.userId, name: 'Python for Data Science', desc: 'NumPy, Pandas and Matplotlib for data analysis', lessons: [
      'Python Basics Recap', 'NumPy Arrays', 'Pandas DataFrames', 'Cleaning Data', 'Data Visualisation', 'Mini Project',
    ] },
    { trackId: dataTrack.id, teacherId: tData.userId, name: 'Machine Learning Basics', desc: 'Supervised learning fundamentals with scikit-learn', lessons: [
      'What is Machine Learning?', 'Linear Regression', 'Classification', 'Model Evaluation', 'Mini Project',
    ] },
  ];

  const subjects = [];
  for (const sd of subjectDefs) {
    let subj = await prisma.course.findFirst({ where: { Course_id: sd.trackId, name: sd.name } });
    if (!subj) {
      subj = await prisma.course.create({
        data: { Course_id: sd.trackId, Teacher_id: sd.teacherId, name: sd.name, Description: sd.desc, isPaid: false, price: 0 },
      });
    }
    const lessons = [];
    for (let i = 0; i < sd.lessons.length; i++) {
      const lname = sd.lessons[i];
      let lesson = await prisma.lesson.findFirst({ where: { Subject_id: subj.id, name: lname } });
      if (!lesson) {
        lesson = await prisma.lesson.create({ data: { Subject_id: subj.id, name: lname, Description: `${lname} — lesson ${i + 1} of ${sd.name}` } });
      }
      lessons.push(lesson);
    }
    subjects.push({ ...subj, lessons });
    log(`Subject: ${sd.name} (id=${subj.id}, ${lessons.length} lessons)`);
  }

  // ── 5. Quizzes (one per lesson, published, with 2 questions) ────────────────
  const allLessons = subjects.flatMap((s) => s.lessons.map((l) => ({ ...l, subjectId: s.id })));
  const quizByLesson = new Map();
  for (const lesson of allLessons) {
    let quiz = await prisma.quiz.findUnique({ where: { lessonId: lesson.id } });
    if (!quiz) {
      quiz = await prisma.quiz.create({
        data: { lessonId: lesson.id, title: `${lesson.name} — Quiz`, description: `Check your understanding of "${lesson.name}"`, difficulty: 'MEDIUM', passingScore: 70, isPublished: true },
      });
      await prisma.quiz_question.createMany({
        data: [
          { quizId: quiz.id, lang: 'en', type: 'MULTIPLE_CHOICE', question: `Which statement best describes "${lesson.name}"?`, options: JSON.stringify(['Correct explanation', 'Unrelated topic', 'Common misconception', 'None of the above']), correctAnswer: 0, orderIndex: 0 },
          { quizId: quiz.id, lang: 'en', type: 'MULTIPLE_CHOICE', question: `What is a key takeaway from "${lesson.name}"?`, options: JSON.stringify(['Key concept A', 'Key concept B', 'Key concept C', 'Key concept D']), correctAnswer: 1, orderIndex: 1 },
        ],
      });
    }
    quizByLesson.set(lesson.id, quiz);
  }
  log(`Quizzes: ${quizByLesson.size} (one per lesson, published)`);

  // ── 6. Students (12, in 3 performance tiers) ────────────────────────────────
  const studentDefs = [
    // High performers (active, high XP, long streaks)
    { name: 'Liam Hayes', email: 'liam.h@novaspark.test', gender: 'MALE', tier: 'high' },
    { name: 'Sofia Martin', email: 'sofia@novaspark.test', gender: 'FEMALE', tier: 'high' },
    { name: 'Ethan Brooks', email: 'ethan.b@novaspark.test', gender: 'MALE', tier: 'high' },
    // Average / steady students
    { name: 'Mia Foster', email: 'mia.f@novaspark.test', gender: 'FEMALE', tier: 'mid' },
    { name: 'Lucas Reed', email: 'lucas@novaspark.test', gender: 'MALE', tier: 'mid' },
    { name: 'Grace Patel', email: 'grace@novaspark.test', gender: 'FEMALE', tier: 'mid' },
    { name: 'Oliver Shaw', email: 'oliver@novaspark.test', gender: 'MALE', tier: 'mid' },
    { name: 'Chloe Nguyen', email: 'chloe@novaspark.test', gender: 'FEMALE', tier: 'mid' },
    // At-risk / inactive students
    { name: 'Henry Cole', email: 'henry@novaspark.test', gender: 'MALE', tier: 'low' },
    { name: 'Zara Ahmed', email: 'zara@novaspark.test', gender: 'FEMALE', tier: 'low' },
    { name: 'Mason Clark', email: 'mason@novaspark.test', gender: 'MALE', tier: 'low' },
    { name: 'Ivy Robinson', email: 'ivy@novaspark.test', gender: 'FEMALE', tier: 'low' },
  ];

  const students = [];
  for (const sd of studentDefs) {
    const sUser = await ensureUser({ email: sd.email, name: sd.name, role: 'STUDENT', gender: sd.gender });
    let au = await prisma.academy_user.findUnique({ where: { user_academy_id: sUser.id } });
    if (!au) {
      au = await prisma.academy_user.create({ data: { user_academy_id: sUser.id, OrgId: orgId, AcademicStatus: 'ACTIVE' } });
    }
    students.push({ userId: sUser.id, academyUserId: au.user_academy_id, ...sd });
    log(`Student (${sd.tier}): ${sd.name} (id=${sUser.id})`);
  }

  // ── 7. Enrollments (every student enrolled in both tracks) ──────────────────
  for (const student of students) {
    for (const track of tracks) {
      const exists = await prisma.enrollment.findUnique({
        where: { user_Academy_id_Course_id: { user_Academy_id: student.academyUserId, Course_id: track.id } },
      });
      if (!exists) {
        await prisma.enrollment.create({ data: { user_Academy_id: student.academyUserId, Course_id: track.id } });
      }
    }
  }
  log('Enrollments created');

  // ── 8. Lesson progress — tiered completion, spread across the last 7 days ──
  const tierCompletionRatio = { high: 0.85, mid: 0.45, low: 0.12 };
  const progressByStudent = new Map();
  for (const student of students) {
    const ratio = tierCompletionRatio[student.tier];
    const count = Math.max(1, Math.round(allLessons.length * ratio));
    const toComplete = allLessons.slice(0, count);
    const completed = [];
    for (let i = 0; i < toComplete.length; i++) {
      const lesson = toComplete[i];
      const dayOffset = i % 7; // spread across the last 7 days
      const when = daysAgo(dayOffset, 10 + (i % 6));
      const exists = await prisma.lesson_progress.findUnique({ where: { studentId_lessonId: { studentId: student.userId, lessonId: lesson.id } } });
      if (!exists) {
        await prisma.lesson_progress.create({
          data: { studentId: student.userId, lessonId: lesson.id, isCompleted: true, watchedSeconds: 600 + (i % 5) * 300, createdAt: when, updatedAt: when },
        });
      }
      completed.push({ lesson, when });
    }
    progressByStudent.set(student.userId, completed);
  }
  log('Lesson progress created (tiered completion across last 7 days)');

  // ── 9. Quiz attempts — last 30 days, mostly within last 7d, tiered pass rate
  const tierPassRate = { high: 0.9, mid: 0.6, low: 0.25 };
  const attemptsByStudent = new Map();
  for (const student of students) {
    const completed = progressByStudent.get(student.userId) ?? [];
    const passRate = tierPassRate[student.tier];
    const attempts = [];
    for (let i = 0; i < completed.length; i++) {
      const { lesson, when } = completed[i];
      const quiz = quizByLesson.get(lesson.id);
      if (!quiz) continue;
      const isPassed = (i % 10) / 10 < passRate;
      const score = isPassed ? 70 + ((i * 7) % 30) : 30 + ((i * 11) % 35);
      // Spread attempts across the last 30 days, but keep the most recent
      // ones aligned with the lesson-completion day so the 7-day trend has data.
      const attemptWhen = i < 4 ? when : daysAgo(7 + ((i * 5) % 23), 14 + (i % 4));
      const exists = await prisma.quiz_attempt.findFirst({ where: { quizId: quiz.id, studentId: student.userId } });
      if (!exists) {
        await prisma.quiz_attempt.create({
          data: { quizId: quiz.id, studentId: student.userId, answers: JSON.stringify({ '0': isPassed ? 0 : 2, '1': isPassed ? 1 : 0 }), score, isPassed, createdAt: attemptWhen },
        });
      }
      attempts.push({ quiz, lesson, isPassed, when: attemptWhen });
    }
    attemptsByStudent.set(student.userId, attempts);
  }
  log('Quiz attempts created (tiered pass rates across last 30 days)');

  // ── 10. XP summaries + streaks (tiered) ─────────────────────────────────────
  const tierXp = { high: { totalXp: [2400, 3200], level: [6, 8], streak: [6, 12], lastActive: [0, 1] },
                   mid:  { totalXp: [900, 1600],  level: [3, 5], streak: [1, 4],  lastActive: [2, 4] },
                   low:  { totalXp: [50, 300],    level: [1, 2], streak: [0, 1],  lastActive: [12, 21] } };
  const pick = ([lo, hi], i) => lo + ((hi - lo) ? (i % (hi - lo + 1)) : 0);

  for (let idx = 0; idx < students.length; idx++) {
    const student = students[idx];
    const cfg = tierXp[student.tier];
    const totalXp = pick(cfg.totalXp, idx * 37);
    const level = pick(cfg.level, idx);
    const currentStreak = pick(cfg.streak, idx * 3);
    const lastActivityAt = daysAgo(pick(cfg.lastActive, idx * 5), 8 + (idx % 10));

    await prisma.student_xp_summary.upsert({
      where: { studentId: student.userId },
      update: { totalXp, level },
      create: { studentId: student.userId, totalXp, level },
    });
    await prisma.student_streak.upsert({
      where: { studentId: student.userId },
      update: { currentStreak, longestStreak: Math.max(currentStreak, pick(cfg.streak, idx * 3) + 2), lastActivityAt },
      create: { studentId: student.userId, currentStreak, longestStreak: Math.max(currentStreak, 2), lastActivityAt },
    });
  }
  log('XP summaries and streaks created (tiered)');

  // ── 11. XP events — last 7 days, varied types (drives activity feed + trend)
  const eventTypeForLesson = 'LESSON_COMPLETE';
  let eventCount = 0;
  for (const student of students) {
    if (student.tier === 'low') continue; // at-risk students stay quiet (no recent events)

    const completed = progressByStudent.get(student.userId) ?? [];
    const attempts = attemptsByStudent.get(student.userId) ?? [];

    // Lesson-completion events for the most recent completions (last 7 days)
    for (const { lesson, when } of completed.slice(-6)) {
      const ok = await prisma.xp_event.findUnique({ where: { uq_xp_event_source: { studentId: student.userId, eventType: eventTypeForLesson, sourceType: 'lesson', sourceId: lesson.id } } }).catch(() => null);
      if (!ok) {
        await prisma.xp_event.create({
          data: { studentId: student.userId, eventType: eventTypeForLesson, xpAwarded: 20, sourceType: 'lesson', sourceId: lesson.id, createdAt: when },
        }).catch(() => {});
        eventCount++;
      }
    }

    // Quiz pass / perfect-score events for recent passing attempts
    for (const { quiz, isPassed, when, score } of attempts.slice(-6)) {
      if (!isPassed) continue;
      const type = score >= 95 ? 'QUIZ_PERFECT' : 'QUIZ_PASS';
      const ok = await prisma.xp_event.findUnique({ where: { uq_xp_event_source: { studentId: student.userId, eventType: type, sourceType: 'quiz', sourceId: quiz.id } } }).catch(() => null);
      if (!ok) {
        await prisma.xp_event.create({
          data: { studentId: student.userId, eventType: type, xpAwarded: type === 'QUIZ_PERFECT' ? 50 : 30, sourceType: 'quiz', sourceId: quiz.id, createdAt: when },
        }).catch(() => {});
        eventCount++;
      }
    }

    // Daily logins + feature usage spread across the last 6 days
    const featureTypes = ['DAILY_LOGIN', 'FLASHCARD_SESSION', 'MINDMAP_SESSION', 'CHATBOT_SESSION'];
    for (let d = 0; d < 6; d++) {
      const type = featureTypes[(d + student.userId) % featureTypes.length];
      const sourceId = 1000 + d; // synthetic per-day source id, distinct from real lesson/quiz ids
      const ok = await prisma.xp_event.findUnique({ where: { uq_xp_event_source: { studentId: student.userId, eventType: type, sourceType: 'daily', sourceId } } }).catch(() => null);
      if (!ok) {
        await prisma.xp_event.create({
          data: { studentId: student.userId, eventType: type, xpAwarded: type === 'DAILY_LOGIN' ? 5 : 15, sourceType: 'daily', sourceId, createdAt: daysAgo(d, 8 + (d % 12)) },
        }).catch(() => {});
        eventCount++;
      }
    }
  }
  log(`XP events created (~${eventCount} new events across last 7 days)`);

  // ── 12. Registration numbers ─────────────────────────────────────────────────
  const allUserIds = [...teachers.map((t) => t.userId), ...students.map((s) => s.userId)];
  let seq = org.userSequence || 0;
  for (const uid of allUserIds) {
    const u = await prisma.user.findUnique({ where: { id: uid }, select: { registrationNumber: true } });
    if (u?.registrationNumber) continue;
    seq++;
    await prisma.user.update({ where: { id: uid }, data: { registrationNumber: `${ORG_CODE}-${String(seq).padStart(5, '0')}` } });
  }
  await prisma.organization.update({ where: { id: orgId }, data: { userSequence: seq } });
  log(`Registration numbers: ${ORG_CODE}-00001 → ${ORG_CODE}-${String(seq).padStart(5, '0')}`);

  // ── 13. Subscription (Academy Pro — unlocks AI_CHAT, NOTIFICATIONS, ANALYTICS)
  const existingSub = await prisma.subscription.findFirst({
    where: { organizationId: orgId, status: 'ACTIVE' },
  });
  if (!existingSub) {
    const academyPlan = await prisma.plan.findFirst({ where: { name: 'Academy Pro' } });
    if (academyPlan) {
      const startDate = daysAgo(30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 335);
      const sub = await prisma.subscription.create({
        data: { organizationId: orgId, planId: academyPlan.id, startDate, endDate, status: 'ACTIVE', autoRenew: true },
      });
      await prisma.payment.create({
        data: { subscriptionId: sub.id, organizationId: orgId, amount: academyPlan.price, paymentMethod: 'MANUAL', status: 'COMPLETED', paymentDate: startDate },
      });
      log(`Subscription: Academy Pro (active until ${endDate.toISOString().slice(0, 10)})`);
    } else {
      log('⚠ "Academy Pro" plan not found — skipping subscription (run scripts/resetPlans.js first)');
    }
  } else {
    log('Subscription already active — skipping');
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              NOVASPARK ACADEMY SEED COMPLETE ✓                   ║
╠══════════════════════════════════════════════════════════════════╣
║  All accounts use password:  Learnova@123                        ║
╠══════════════════════════╦═══════════════════════════════════════╣
║  Role                    ║ Email                                  ║
╠══════════════════════════╬═══════════════════════════════════════╣
║  Academy Org             ║ academy@novaspark.test                ║
║  Teacher (Web Dev)       ║ ava@novaspark.test                     ║
║  Teacher (Data Science)  ║ noah2@novaspark.test                   ║
║  Student (high)          ║ liam.h@novaspark.test                  ║
║  Student (high)          ║ sofia@novaspark.test                   ║
║  Student (high)          ║ ethan.b@novaspark.test                 ║
║  Student (mid)           ║ mia.f@novaspark.test                   ║
║  Student (mid)           ║ lucas@novaspark.test                   ║
║  Student (mid)           ║ grace@novaspark.test                   ║
║  Student (mid)           ║ oliver@novaspark.test                  ║
║  Student (mid)           ║ chloe@novaspark.test                   ║
║  Student (low/at-risk)   ║ henry@novaspark.test                   ║
║  Student (low/at-risk)   ║ zara@novaspark.test                    ║
║  Student (low/at-risk)   ║ mason@novaspark.test                   ║
║  Student (low/at-risk)   ║ ivy@novaspark.test                     ║
╠══════════════════════════╩═══════════════════════════════════════╣
║  Org Code: ${ORG_CODE}                                                  ║
║  Log in as a teacher → Analytics page should now show real data  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  await prisma.$disconnect();
};

run().catch(async (err) => {
  console.error('[ACADEMY-ANALYTICS] Error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
