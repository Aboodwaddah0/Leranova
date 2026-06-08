/**
 * schoolPromotionReadyPatch.js — idempotent patch for an already-seeded
 * "Greenfield International School" (school@learnova.test) so it is ready
 * for promotion testing:
 *   - Closes every term of its active academic year (CLOSED/LOCKED required
 *     by runAnnualPromotionForOrg before promotion can run)
 *   - Ensures a second ("next") academic year exists so the Promote Students
 *     page has a Target Session to pick from
 *
 * Usage:
 *   node scripts/schoolPromotionReadyPatch.js
 */

import 'dotenv/config';
import prisma from '../src/utils/prisma.js';

const log = (msg) => console.log(`[PATCH] ${msg}`);
const d = (str) => new Date(str);

const run = async () => {
  await prisma.$connect();
  log('Connected');

  const org = await prisma.organization.findUnique({ where: { Email: 'school@learnova.test' } });
  if (!org) {
    throw new Error('Organization "school@learnova.test" not found — run scripts/schoolTestSeed.js first');
  }
  log(`Org: ${org.Name} (id=${org.id})`);

  const activeYear = await prisma.academic_year.findFirst({
    where: { OrgId: org.id, isActive: true },
    include: { terms: true },
  });

  if (activeYear) {
    const openTerms = activeYear.terms.filter((t) => t.status !== 'CLOSED' && t.status !== 'LOCKED');
    if (openTerms.length) {
      await prisma.term.updateMany({
        where: { id: { in: openTerms.map((t) => t.id) } },
        data: { status: 'CLOSED' },
      });
      log(`Closed ${openTerms.length} term(s) of "${activeYear.name}" (id=${activeYear.id})`);
    } else {
      log(`All terms of "${activeYear.name}" (id=${activeYear.id}) are already CLOSED/LOCKED`);
    }
  } else {
    log('No active academic year found — skipping term patch');
  }

  const otherYear = await prisma.academic_year.findFirst({
    where: { OrgId: org.id, ...(activeYear ? { id: { not: activeYear.id } } : {}) },
  });

  if (otherYear) {
    log(`Target session already exists: "${otherYear.name}" (id=${otherYear.id})`);
  } else {
    const nextYear = await prisma.academic_year.create({
      data: {
        OrgId: org.id,
        name: '2026-2027',
        startDate: d('2026-09-01'),
        endDate: d('2027-06-30'),
        numberOfTerms: 2,
        isActive: false,
      },
    });
    await prisma.term.create({
      data: {
        academicYearId: nextYear.id,
        termNumber: 1,
        name: 'First Semester',
        startDate: d('2026-09-01'),
        endDate: d('2027-01-31'),
        status: 'PLANNED',
      },
    });
    await prisma.term.create({
      data: {
        academicYearId: nextYear.id,
        termNumber: 2,
        name: 'Second Semester',
        startDate: d('2027-02-01'),
        endDate: d('2027-06-30'),
        status: 'PLANNED',
      },
    });
    log(`Created target session "2026-2027" (id=${nextYear.id}) with 2 terms`);
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║          SCHOOL ACCOUNT IS PROMOTION-READY ✓                     ║
╠══════════════════════════════════════════════════════════════════╣
║  Login:    school@learnova.test                                   ║
║  Password: Learnova@123                                          ║
║  → Students → "Promote Students" → pick source/target sessions   ║
╚══════════════════════════════════════════════════════════════════╝
`);
};

run()
  .catch((err) => { console.error('[PATCH] Failed:', err); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
