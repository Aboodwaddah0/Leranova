import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schoolOrgs = await prisma.organization.findMany({
    where: { Role: 'SCHOOL' },
    select: { id: true, Name: true },
  });

  if (schoolOrgs.length === 0) {
    console.log('No school organizations found. Nothing to delete.');
    return;
  }

  const orgIds = schoolOrgs.map((org) => org.id);
  const academicYears = await prisma.academic_year.findMany({
    where: { OrgId: { in: orgIds } },
    select: { id: true, OrgId: true, name: true },
  });

  if (academicYears.length === 0) {
    console.log('No academic years found for school organizations. Nothing to delete.');
    return;
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const result = await tx.academic_year.deleteMany({
      where: { OrgId: { in: orgIds } },
    });

    return result.count;
  });

  console.log(
    JSON.stringify(
      {
        schoolOrganizations: schoolOrgs,
        deletedAcademicYears: academicYears.length,
        deletedRows: deleted,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });