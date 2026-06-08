/**
 * seedAcademyGraduate.js
 * Creates a completed academy student with certificates for all subjects.
 *
 * Usage:
 *   docker exec learnova-api node scripts/seedAcademyGraduate.js
 *
 * Account:  graduate@horizon.test  /  Learnova@123
 */

import "dotenv/config";
import prisma from "../src/utils/prisma.js";
import { hashPassword } from "../src/utils/hashPassword.js";

const log = (msg) => console.log(`[GRAD] ${msg}`);

const run = async () => {
  await prisma.$connect();
  log("Connected");

  const pwHash = await hashPassword("Learnova@123");
  const orgId  = 4; // Horizon Academy

  // ── 1. Create user ───────────────────────────────────────────────────────────
  let user = await prisma.user.findUnique({ where: { email: "graduate@horizon.test" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name:            "Jordan Lee",
        email:           "graduate@horizon.test",
        passwordHashed:  pwHash,
        role:            "STUDENT",
        gender:          "MALE",
        registrationNumber: "HRZN-00008",
      },
    });
    log(`User created: Jordan Lee (id=${user.id})`);
  } else {
    log(`User exists: ${user.name} (id=${user.id})`);
  }

  const userId = user.id;

  // ── 2. academy_user record ────────────────────────────────────────────────────
  const existingAU = await prisma.academy_user.findUnique({ where: { user_academy_id: userId } });
  if (!existingAU) {
    await prisma.academy_user.create({
      data: { user_academy_id: userId, OrgId: orgId, AcademicStatus: "ACTIVE" },
    });
    log("academy_user record created");
  }

  // ── 3. student record (needed for student_certificate FK) ─────────────────────
  const existingStu = await prisma.student.findUnique({ where: { Student_id: userId } });
  if (!existingStu) {
    await prisma.student.create({
      data: { Student_id: userId, OrgId: orgId, AcademicStatus: "ACTIVE" },
    });
    log("student record created (for certificate FK)");
  }

  // ── 4. Enroll in all Horizon Academy tracks ────────────────────────────────────
  const tracks = await prisma.track.findMany({ where: { Org_id: orgId, kind: "TRACK" } });
  for (const track of tracks) {
    const exists = await prisma.enrollment.findUnique({
      where: { user_Academy_id_Course_id: { user_Academy_id: userId, Course_id: track.id } },
    });
    if (!exists) {
      await prisma.enrollment.create({ data: { user_Academy_id: userId, Course_id: track.id } });
    }
  }
  log(`Enrolled in ${tracks.length} tracks`);

  // ── 5. Mark ALL lessons as completed ──────────────────────────────────────────
  const allLessons = await prisma.lesson.findMany({
    where: { course: { track: { Org_id: orgId } } },
    select: { id: true },
  });

  for (const lesson of allLessons) {
    await prisma.lesson_progress.upsert({
      where:  { studentId_lessonId: { studentId: userId, lessonId: lesson.id } },
      create: { studentId: userId, lessonId: lesson.id, isCompleted: true, watchedSeconds: 2400 },
      update: { isCompleted: true, watchedSeconds: 2400 },
    });
  }
  log(`${allLessons.length} lessons marked as completed`);

  // ── 6. Issue certificate for every subject ────────────────────────────────────
  const subjects = await prisma.course.findMany({
    where: { track: { Org_id: orgId } },
    select: { id: true, name: true, Course_id: true },
  });

  let certCount = 0;
  for (const subj of subjects) {
    try {
      // Use raw SQL — Prisma upsert rejects NULL termId in the compound unique key
      await prisma.$executeRaw`
        INSERT INTO student_certificate (studentId, orgId, subjectId, trackId, termId, isPublished, issuedAt, createdAt)
        VALUES (${userId}, ${orgId}, ${subj.id}, ${subj.Course_id}, NULL, 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE isPublished = 1
      `;
      certCount++;
      log(`  Certificate: ${subj.name}`);
    } catch (err) {
      log(`  WARN: certificate for ${subj.name} — ${err.message}`);
    }
  }
  log(`${certCount} certificates issued`);

  // ── 7. Update org userSequence ────────────────────────────────────────────────
  await prisma.organization.update({ where: { id: orgId }, data: { userSequence: 8 } });

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ACADEMY GRADUATE SEED COMPLETE ✓                   ║
╠══════════════════════════════════════════════════════════════╣
║  Name:      Jordan Lee                                        ║
║  Email:     graduate@horizon.test                             ║
║  Password:  Learnova@123                                      ║
║  Org Code:  HRZN                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Completed: ${String(allLessons.length).padEnd(2)} lessons                                ║
║  Certs:     ${String(certCount).padEnd(2)} certificates (1 per subject)           ║
╚══════════════════════════════════════════════════════════════╝
`);

  await prisma.$disconnect();
};

run().catch((err) => {
  console.error("[GRAD] Error:", err.message);
  prisma.$disconnect();
  process.exit(1);
});
