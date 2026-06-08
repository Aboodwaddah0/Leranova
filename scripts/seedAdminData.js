/**
 * seedAdminData.js
 * Adds extra organizations + payment records so the admin dashboard
 * shows realistic metrics (total orgs, revenue, subscriptions, payments).
 *
 * Safe to run on top of existing data — skips duplicates by email.
 *
 * Usage:
 *   docker exec learnova-api node scripts/seedAdminData.js
 */

import "dotenv/config";
import prisma from "../src/utils/prisma.js";
import { hashPassword } from "../src/utils/hashPassword.js";

const log = (msg) => console.log(`[SEED-ADMIN] ${msg}`);
const d = (str) => new Date(str);

const run = async () => {
  await prisma.$connect();
  log("Connected");

  const pwHash = await hashPassword("Admin@12345");

  // ── 1. Fetch plans ────────────────────────────────────────────────────────
  const [starterPlan, proPlan, schoolPlan] = await Promise.all([
    prisma.plan.findFirst({ where: { name: "Academy Starter" } }),
    prisma.plan.findFirst({ where: { name: "Academy Pro" } }),
    prisma.plan.findFirst({ where: { name: "School Edition" } }),
  ]);

  if (!starterPlan || !proPlan || !schoolPlan) {
    log("⚠  Plans not found — run scripts/resetPlans.js first");
    process.exit(1);
  }

  // ── 2. Extra organizations ────────────────────────────────────────────────
  const orgDefs = [
    {
      Name: "Horizon Academy",
      Email: "academy@horizon.test",
      Role: "ACADEMY",
      status: "APPROVED",
      Phone: "+1-555-100-2000",
      Address: "45 Learning Lane, Boston",
      Description: "Online academy specialising in technology and programming courses",
      organizationCode: "HRZN",
      plan: proPlan,
      paidAt: d("2026-03-01"),
      amount: proPlan.price,
    },
    {
      Name: "Sunrise Language School",
      Email: "admin@sunrise-lang.test",
      Role: "SCHOOL",
      status: "APPROVED",
      Phone: "+44-20-7946-0333",
      Address: "12 Oxford Street, London",
      Description: "Premier language school offering English, French and Spanish programmes",
      organizationCode: "SUNRS",
      plan: schoolPlan,
      paidAt: d("2026-02-15"),
      amount: schoolPlan.price,
    },
    {
      Name: "DataSpark Academy",
      Email: "info@dataspark.test",
      Role: "ACADEMY",
      status: "APPROVED",
      Phone: "+1-415-555-9900",
      Address: "888 Market St, San Francisco",
      Description: "Data science and AI bootcamp for working professionals",
      organizationCode: "DSPK",
      plan: starterPlan,
      paidAt: d("2026-04-10"),
      amount: starterPlan.price,
    },
    {
      Name: "Valley Primary School",
      Email: "office@valleyprimary.test",
      Role: "SCHOOL",
      status: "PENDING",
      Phone: "+61-2-5550-7788",
      Address: "33 Blue Mountains Rd, Sydney",
      Description: "Primary school registration — awaiting approval",
      organizationCode: null,
      plan: null,
      paidAt: null,
      amount: null,
    },
    {
      Name: "CodeNest Bootcamp",
      Email: "hello@codenest.test",
      Role: "ACADEMY",
      status: "APPROVED",
      Phone: "+1-312-555-4400",
      Address: "200 Michigan Ave, Chicago",
      Description: "Full-stack web development bootcamp — 12-week intensive",
      organizationCode: "CNST",
      plan: starterPlan,
      paidAt: d("2026-05-05"),
      amount: starterPlan.price,
    },
  ];

  const createdOrgs = [];

  for (const def of orgDefs) {
    const existing = await prisma.organization.findUnique({ where: { Email: def.Email } });
    if (existing) {
      log(`Skip (exists): ${def.Name}`);
      createdOrgs.push({ org: existing, ...def });
      continue;
    }

    const orgData = {
      Name:             def.Name,
      Email:            def.Email,
      Password_Hashed:  pwHash,
      Role:             def.Role,
      status:           def.status,
      Phone:            def.Phone,
      Address:          def.Address,
      Description:      def.Description,
    };
    if (def.organizationCode) orgData.organizationCode = def.organizationCode;

    const org = await prisma.organization.create({ data: orgData });
    log(`Created org: ${org.Name} (id=${org.id}, status=${org.status})`);
    createdOrgs.push({ org, ...def });
  }

  // ── 3. Subscriptions + payments for approved orgs ──────────────────────────
  for (const entry of createdOrgs) {
    const { org, plan, paidAt, amount } = entry;
    if (!plan || !paidAt) continue;

    // Check subscription already exists
    const existingSub = await prisma.subscription.findFirst({
      where: { organizationId: org.id, planId: plan.id },
    });
    if (existingSub) {
      log(`Sub exists for ${org.Name} — skip`);
      continue;
    }

    const startDate = paidAt;
    const endDate   = new Date(paidAt);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const sub = await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planId:         plan.id,
        startDate,
        endDate,
        status:         "ACTIVE",
        autoRenew:      true,
      },
    });

    // Add a main subscription payment
    await prisma.payment.create({
      data: {
        subscriptionId: sub.id,
        organizationId: org.id,
        amount,
        paymentMethod:  "STRIPE",
        status:         "COMPLETED",
        paymentDate:    paidAt,
      },
    });

    log(`Subscription + payment created for ${org.Name} ($${amount})`);
  }

  // ── 4. Fix existing Greenfield payment to be visible in analytics ─────────
  const gf = await prisma.organization.findUnique({ where: { Email: "school@learnova.test" } });
  if (gf) {
    const gfPayment = await prisma.payment.findFirst({ where: { organizationId: gf.id } });
    if (gfPayment && gfPayment.paymentMethod === "MANUAL") {
      await prisma.payment.update({
        where: { id: gfPayment.id },
        data: { paymentMethod: "STRIPE", paymentDate: d("2025-09-01") },
      });
      log("Fixed Greenfield payment method → STRIPE");
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalOrgs     = await prisma.organization.count();
  const totalPayments = await prisma.payment.count();
  const totalRevenue  = await prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } });

  console.log(`
╔══════════════════════════════════════════════════════╗
║          ADMIN SEED COMPLETE ✓                        ║
╠══════════════════════════════════════════════════════╣
║  Admin login:  admin@learnova.local                   ║
║  Password:     Admin@12345                            ║
╠══════════════════════════════════════════════════════╣
║  Total orgs:      ${String(totalOrgs).padEnd(32)}║
║  Total payments:  ${String(totalPayments).padEnd(32)}║
║  Total revenue:   $${String(Number(totalRevenue._sum.amount||0).toFixed(2)).padEnd(31)}║
╚══════════════════════════════════════════════════════╝
`);

  await prisma.$disconnect();
};

run().catch((err) => {
  console.error("[SEED-ADMIN] Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
