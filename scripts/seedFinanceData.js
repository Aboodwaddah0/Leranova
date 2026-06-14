/**
 * seedFinanceData.js
 * Adds simple paid-subject + payment data for the Finance tab of
 * "TechLearn Academy" (academy2@learnova.test).
 *
 * - Marks "React.js" and "Machine Learning" subjects as paid.
 * - Creates a handful of SUCCESS/PAID student_subject_subscription rows
 *   for already-enrolled students.
 *
 * Usage:
 *   docker exec learnova-api node scripts/seedFinanceData.js
 */

import "dotenv/config";
import prisma from "../src/utils/prisma.js";

const log = (msg) => console.log(`[SEED-FINANCE] ${msg}`);

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const run = async () => {
  const org = await prisma.organization.findUnique({
    where: { Email: "academy2@learnova.test" },
    select: { id: true, Name: true },
  });

  if (!org) {
    throw new Error("Organization academy2@learnova.test not found");
  }

  log(`Org found: ${org.Name} (id=${org.id})`);

  // 1. Mark two subjects as paid
  const reactSubject = await prisma.course.update({
    where: { id: 51 }, // React.js
    data: { isPaid: true, price: 49.99 },
  });
  const mlSubject = await prisma.course.update({
    where: { id: 53 }, // Machine Learning
    data: { isPaid: true, price: 79.99 },
  });
  log(`Marked paid: ${reactSubject.name} ($${reactSubject.price}), ${mlSubject.name} ($${mlSubject.price})`);

  // 2. Create payment subscriptions for already-enrolled students (96-100)
  const subscriptionPlan = [
    { userAcademyId: 96, subjectId: reactSubject.id, daysBack: 12, method: "STRIPE" },
    { userAcademyId: 97, subjectId: reactSubject.id, daysBack: 9,  method: "STRIPE" },
    { userAcademyId: 98, subjectId: reactSubject.id, daysBack: 5,  method: "MANUAL" },
    { userAcademyId: 96, subjectId: mlSubject.id,    daysBack: 8,  method: "STRIPE" },
    { userAcademyId: 99, subjectId: mlSubject.id,    daysBack: 4,  method: "STRIPE" },
    { userAcademyId: 100, subjectId: mlSubject.id,   daysBack: 1,  method: "MANUAL" },
  ];

  for (const p of subscriptionPlan) {
    const subject = p.subjectId === reactSubject.id ? reactSubject : mlSubject;

    await prisma.student_subject_subscription.upsert({
      where: {
        user_Academy_id_Subject_id: {
          user_Academy_id: p.userAcademyId,
          Subject_id: p.subjectId,
        },
      },
      update: {
        amount: subject.price,
        paymentMethod: p.method,
        paymentStatus: "PAID",
        status: "SUCCESS",
        paidAt: daysAgo(p.daysBack),
      },
      create: {
        user_Academy_id: p.userAcademyId,
        Subject_id: p.subjectId,
        amount: subject.price,
        paymentMethod: p.method,
        paymentStatus: "PAID",
        status: "SUCCESS",
        paidAt: daysAgo(p.daysBack),
      },
    });
    log(`Subscription: student=${p.userAcademyId} subject=${subject.name} amount=$${subject.price} (${p.daysBack}d ago)`);
  }

  log("Done.");
};

run()
  .catch((err) => {
    console.error("[SEED-FINANCE] Failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
