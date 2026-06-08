/**
 * academySeed.js — fills Horizon Academy (id=4) with complete data.
 *
 * Usage:
 *   docker exec learnova-api node scripts/academySeed.js
 *
 * All accounts use password: Learnova@123
 */

import "dotenv/config";
import prisma from "../src/utils/prisma.js";
import { hashPassword } from "../src/utils/hashPassword.js";

const log = (msg) => console.log(`[SEED-ACADEMY] ${msg}`);
const d = (str) => new Date(str);

const run = async () => {
  await prisma.$connect();
  log("Connected");

  const pwHash = await hashPassword("Learnova@123");

  // ── 1. Org ──────────────────────────────────────────────────────────────────
  const org = await prisma.organization.findUnique({ where: { id: 4 } });
  if (!org) { log("Horizon Academy (id=4) not found — run seedAdminData.js first"); process.exit(1); }
  const orgId = org.id;
  log(`Using org: ${org.Name} (id=${orgId})`);

  // ── 2. Teachers ──────────────────────────────────────────────────────────────
  const teacherDefs = [
    { name: "Sarah Mitchell",  email: "sarah@horizon.test",  spec: "Web Development",  bio: "Full-stack engineer with 8 years industry experience" },
    { name: "Chris Anderson",  email: "chris@horizon.test",  spec: "Data Science",     bio: "Data scientist and ML engineer, ex-Google" },
  ];

  const teachers = [];
  for (const td of teacherDefs) {
    const existing = await prisma.user.findUnique({ where: { email: td.email } });
    if (existing) { log(`Teacher exists: ${td.name}`); teachers.push({ userId: existing.id, teacherId: existing.id, ...td }); continue; }
    const tUser = await prisma.user.create({
      data: { name: td.name, email: td.email, passwordHashed: pwHash, role: "TEACHER", gender: "FEMALE" },
    });
    await prisma.teacher.create({ data: { Teacher_id: tUser.id, OrgId: orgId, specialization: td.spec, bio: td.bio } });
    teachers.push({ userId: tUser.id, teacherId: tUser.id, ...td });
    log(`Teacher: ${td.name} (id=${tUser.id})`);
  }
  const [t_web, t_data] = teachers;

  // ── 3. Tracks (courses) ───────────────────────────────────────────────────────
  const trackDefs = [
    { name: "Web Development Track", desc: "From HTML basics to full-stack React & Node.js apps", teacherId: t_web.teacherId, price: 0, isPaid: false,
      thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=600&auto=format&fit=crop" },
    { name: "Data Science Track",    desc: "Python, data analysis, machine learning and visualisation", teacherId: t_data.teacherId, price: 0, isPaid: false,
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop" },
  ];

  const tracks = [];
  for (const td of trackDefs) {
    const existing = await prisma.track.findFirst({ where: { Org_id: orgId, Name: td.name } });
    if (existing) { log(`Track exists: ${td.name}`); tracks.push(existing); continue; }
    const track = await prisma.track.create({
      data: { Org_id: orgId, Teacher_id: td.teacherId, Name: td.name, Description: td.desc, kind: "TRACK", price: td.price, isPaid: td.isPaid, Thumbnail: td.thumbnail },
    });
    tracks.push(track);
    log(`Track: ${td.name} (id=${track.id})`);
  }
  const [webTrack, dataTrack] = tracks;

  // ── 4. Subjects ───────────────────────────────────────────────────────────────
  const subjectDefs = [
    // Web Development Track
    { trackId: webTrack.id,  name: "HTML & CSS Fundamentals", teacherId: t_web.teacherId,  price: 0, isPaid: false, desc: "Build web pages from scratch with semantic HTML and modern CSS", img: "https://images.unsplash.com/photo-1621839673705-6617adf9e890?q=80&w=600&auto=format&fit=crop" },
    { trackId: webTrack.id,  name: "JavaScript Essentials",   teacherId: t_web.teacherId,  price: 0, isPaid: false, desc: "Core JavaScript — variables, functions, DOM manipulation and async", img: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?q=80&w=600&auto=format&fit=crop" },
    { trackId: webTrack.id,  name: "React.js",                teacherId: t_web.teacherId,  price: 0, isPaid: false, desc: "Component-based UI development with React hooks and state management", img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop" },
    // Data Science Track
    { trackId: dataTrack.id, name: "Python for Data Science",  teacherId: t_data.teacherId, price: 0, isPaid: false, desc: "NumPy, Pandas and Matplotlib for real-world data analysis", img: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=600&auto=format&fit=crop" },
    { trackId: dataTrack.id, name: "Machine Learning",         teacherId: t_data.teacherId, price: 0, isPaid: false, desc: "Supervised and unsupervised learning algorithms with scikit-learn", img: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=600&auto=format&fit=crop" },
  ];

  const subjects = [];
  for (const sd of subjectDefs) {
    const existing = await prisma.course.findFirst({ where: { Course_id: sd.trackId, name: sd.name } });
    if (existing) { log(`Subject exists: ${sd.name}`); subjects.push({ ...existing, trackId: sd.trackId }); continue; }
    const sub = await prisma.course.create({
      data: { Course_id: sd.trackId, Teacher_id: sd.teacherId, name: sd.name, Description: sd.desc, isPaid: sd.isPaid, price: sd.price, imageUrl: sd.img },
    });
    subjects.push({ ...sub, trackId: sd.trackId });
    log(`Subject: ${sd.name} (id=${sub.id})`);
  }

  // ── 5. Lessons ────────────────────────────────────────────────────────────────
  const lessonMap = {
    "HTML & CSS Fundamentals": [
      { name: "Introduction to HTML",   desc: "Document structure, tags, elements and semantic HTML5" },
      { name: "CSS Styling & Layout",   desc: "Selectors, box model, Flexbox and CSS Grid" },
      { name: "Responsive Design",      desc: "Media queries, mobile-first approach and viewport units" },
    ],
    "JavaScript Essentials": [
      { name: "Variables & Data Types", desc: "let, const, var — strings, numbers, arrays, objects" },
      { name: "Functions & Scope",      desc: "Arrow functions, closures, hoisting and the call stack" },
      { name: "DOM Manipulation",       desc: "Selecting elements, events and dynamic page updates" },
    ],
    "React.js": [
      { name: "Components & Props",     desc: "Functional components, JSX syntax and passing props" },
      { name: "State & useEffect",      desc: "useState, useEffect hooks and component lifecycle" },
      { name: "Routing & Fetch",        desc: "React Router v6 and consuming REST APIs with fetch/axios" },
    ],
    "Python for Data Science": [
      { name: "NumPy Arrays",           desc: "Array creation, indexing, slicing and vectorised operations" },
      { name: "Pandas DataFrames",      desc: "Loading, cleaning, filtering and aggregating tabular data" },
      { name: "Data Visualisation",     desc: "Matplotlib and Seaborn charts for exploratory data analysis" },
    ],
    "Machine Learning": [
      { name: "Linear Regression",      desc: "Fitting a line to data — gradient descent and cost functions" },
      { name: "Classification",         desc: "Logistic regression, k-NN and decision trees" },
      { name: "Model Evaluation",       desc: "Train/test split, cross-validation, precision, recall, F1" },
    ],
  };

  for (const sub of subjects) {
    const lessons = lessonMap[sub.name] ?? [];
    for (const l of lessons) {
      const exists = await prisma.lesson.findFirst({ where: { Subject_id: sub.id, name: l.name } });
      if (exists) continue;
      await prisma.lesson.create({ data: { Subject_id: sub.id, name: l.name, Description: l.desc } });
    }
  }
  log("Lessons created");

  // ── 6. Students ───────────────────────────────────────────────────────────────
  const studentDefs = [
    { name: "Alex Turner",   email: "alex@horizon.test",   gender: "MALE",   dob: "2000-06-12" },
    { name: "Emma Clarke",   email: "emma2@horizon.test",  gender: "FEMALE", dob: "2001-03-22" },
    { name: "Jake Roberts",  email: "jake@horizon.test",   gender: "MALE",   dob: "1999-11-05" },
    { name: "Mia Johnson",   email: "mia@horizon.test",    gender: "FEMALE", dob: "2002-07-18" },
    { name: "Ryan Foster",   email: "ryan@horizon.test",   gender: "MALE",   dob: "2000-01-30" },
  ];

  const students = [];
  for (const sd of studentDefs) {
    const existing = await prisma.user.findUnique({ where: { email: sd.email } });
    if (existing) {
      const au = await prisma.academy_user.findUnique({ where: { user_academy_id: existing.id } });
      if (au) { log(`Student exists: ${sd.name}`); students.push({ userId: existing.id, academyUserId: au.user_academy_id, ...sd }); continue; }
    }
    const sUser = await prisma.user.create({
      data: { name: sd.name, email: sd.email, passwordHashed: pwHash, role: "STUDENT", gender: sd.gender },
    });
    const au = await prisma.academy_user.create({
      data: { user_academy_id: sUser.id, OrgId: orgId, DOB: d(sd.dob), AcademicStatus: "ACTIVE" },
    });
    students.push({ userId: sUser.id, academyUserId: au.user_academy_id, ...sd });
    log(`Student: ${sd.name} (id=${sUser.id})`);
  }

  // ── 7. Enrollments (each student enrolled in both tracks) ─────────────────────
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
  log("Enrollments created");

  // ── 8. Lesson progress (simulate some activity) ──────────────────────────────
  const allLessons = await prisma.lesson.findMany({
    where: { course: { track: { Org_id: orgId } } },
    select: { id: true },
  });

  // First 3 students have completed roughly half the lessons
  for (let i = 0; i < 3; i++) {
    const student = students[i];
    const toComplete = allLessons.slice(0, Math.floor(allLessons.length * 0.5));
    for (const lesson of toComplete) {
      const exists = await prisma.lesson_progress.findUnique({
        where: { studentId_lessonId: { studentId: student.userId, lessonId: lesson.id } },
      });
      if (!exists) {
        await prisma.lesson_progress.create({
          data: { studentId: student.userId, lessonId: lesson.id, isCompleted: true, watchedSeconds: 1800 },
        });
      }
    }
  }
  log("Lesson progress created");

  // ── 9. Registration numbers ───────────────────────────────────────────────────
  const allUsers = [...teachers.map((t) => t.userId), ...students.map((s) => s.userId)];
  let seq = org.userSequence || 0;
  for (const uid of allUsers) {
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { registrationNumber: true } });
    if (user?.registrationNumber) continue;
    seq++;
    await prisma.user.update({ where: { id: uid }, data: { registrationNumber: `HRZN-${String(seq).padStart(5, "0")}` } });
  }
  await prisma.organization.update({ where: { id: orgId }, data: { userSequence: seq } });
  log(`Registration numbers: HRZN-00001 → HRZN-${String(seq).padStart(5, "0")}`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              ACADEMY SEED COMPLETE ✓                             ║
╠══════════════════════════════════════════════════════════════════╣
║  All accounts use password:  Learnova@123                        ║
╠══════════════════════════╦═══════════════════════════════════════╣
║  Role                    ║ Email                                  ║
╠══════════════════════════╬═══════════════════════════════════════╣
║  Academy Org             ║ academy@horizon.test                   ║
║  Teacher (Web Dev)       ║ sarah@horizon.test                     ║
║  Teacher (Data Science)  ║ chris@horizon.test                     ║
║  Student                 ║ alex@horizon.test                      ║
║  Student                 ║ emma2@horizon.test                     ║
║  Student                 ║ jake@horizon.test                      ║
║  Student                 ║ mia@horizon.test                       ║
║  Student                 ║ ryan@horizon.test                      ║
╠══════════════════════════╩═══════════════════════════════════════╣
║  Org Code: HRZN                                                   ║
╚══════════════════════════════════════════════════════════════════╝
`);

  await prisma.$disconnect();
};

run().catch((err) => {
  console.error("[SEED-ACADEMY] Error:", err.message);
  prisma.$disconnect();
  process.exit(1);
});
