/**
 * seedRevenueData.js
 * Adds fake `payment` (and a few `subscription`) rows dated within the last
 * 30 days so the platform admin Revenue page (/admin/revenue) has data to show.
 *
 * Usage:
 *   docker exec learnova-api node scripts/seedRevenueData.js
 */

import "dotenv/config";
import prisma from "../src/utils/prisma.js";

const log = (msg) => console.log(`[SEED-REVENUE] ${msg}`);

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// Existing plans: 1 = Academy Starter ($49), 2 = Academy Pro ($99), 3 = School Edition ($199)
const PLAN_PRICE = { 1: 49, 2: 99, 3: 199 };

// Orgs that don't yet have a subscription — create one for each so byPlan/recentPayments
// have more variety.
const NEW_SUBS = [
  { organizationId: 9, planId: 3 },  // Test School
  { organizationId: 11, planId: 1 }, // Simple Academy
  { organizationId: 19, planId: 3 }, // Westbrook Academy School
  { organizationId: 20, planId: 2 }, // TechLearn Academy
];

const run = async () => {
  // 1. Create subscriptions for orgs that don't have one yet
  const subByOrg = {};
  for (const { organizationId, planId } of NEW_SUBS) {
    let sub = await prisma.subscription.findFirst({ where: { organizationId } });
    if (!sub) {
      sub = await prisma.subscription.create({
        data: {
          organizationId,
          planId,
          startDate: daysAgo(30),
          endDate: daysAgo(-335), // ~1 year from start
          status: "ACTIVE",
          autoRenew: true,
        },
      });
      log(`Created subscription id=${sub.id} for org ${organizationId} (plan ${planId})`);
    }
    subByOrg[organizationId] = sub;
  }

  // 2. Existing subscriptions to reuse
  const existing = await prisma.subscription.findMany({
    where: { organizationId: { in: [4, 5, 6, 8, 15, 16] } },
  });
  for (const sub of existing) {
    subByOrg[sub.organizationId] = sub;
  }

  // 3. Fake payments spread over the last 30 days
  const payments = [
    { org: 4, daysBack: 2, status: "COMPLETED", method: "STRIPE" },
    { org: 5, daysBack: 3, status: "COMPLETED", method: "STRIPE" },
    { org: 6, daysBack: 4, status: "COMPLETED", method: "STRIPE" },
    { org: 8, daysBack: 5, status: "COMPLETED", method: "MANUAL" },
    { org: 16, daysBack: 6, status: "COMPLETED", method: "STRIPE" },
    { org: 15, daysBack: 7, status: "COMPLETED", method: "MANUAL" },
    { org: 9, daysBack: 8, status: "COMPLETED", method: "STRIPE" },
    { org: 11, daysBack: 9, status: "COMPLETED", method: "STRIPE" },
    { org: 19, daysBack: 10, status: "COMPLETED", method: "MANUAL" },
    { org: 20, daysBack: 11, status: "COMPLETED", method: "STRIPE" },
    { org: 4, daysBack: 12, status: "PENDING", method: "STRIPE" },
    { org: 6, daysBack: 14, status: "PENDING", method: "STRIPE" },
    { org: 8, daysBack: 15, status: "COMPLETED", method: "STRIPE" },
    { org: 16, daysBack: 16, status: "COMPLETED", method: "STRIPE" },
    { org: 15, daysBack: 18, status: "COMPLETED", method: "STRIPE" },
    { org: 5, daysBack: 22, status: "COMPLETED", method: "MANUAL" },
    { org: 11, daysBack: 25, status: "REFUNDED", method: "STRIPE" },
    { org: 9, daysBack: 27, status: "FAILED", method: "STRIPE" },
  ];

  for (const p of payments) {
    const sub = subByOrg[p.org];
    if (!sub) {
      log(`Skipping org ${p.org} — no subscription found`);
      continue;
    }

    await prisma.payment.create({
      data: {
        organizationId: p.org,
        subscriptionId: sub.id,
        amount: PLAN_PRICE[sub.planId],
        paymentDate: daysAgo(p.daysBack),
        paymentMethod: p.method,
        status: p.status,
      },
    });
    log(`Created payment: org=${p.org} amount=${PLAN_PRICE[sub.planId]} status=${p.status} (${p.daysBack}d ago)`);
  }

  log("Done.");
};

run()
  .catch((err) => {
    console.error("[SEED-REVENUE] Failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
