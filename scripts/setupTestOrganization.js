import 'dotenv/config';
import prisma from '../src/utils/prisma.js';
import { hashPassword } from '../src/utils/hashPassword.js';

const setupTestOrganization = async () => {
  const orgEmail = process.env.TEST_ORG_EMAIL || 'test-academy@learnova.local';
  const orgPassword = process.env.TEST_ORG_PASSWORD || 'TestOrg@12345';
  const orgName = process.env.TEST_ORG_NAME || 'Test Academy';
  const orgRole = process.env.TEST_ORG_ROLE || 'ACADEMY';
  const orgSubdomain = process.env.TEST_ORG_SUBDOMAIN || 'test-academy';

  // Check if organization already exists
  const existing = await prisma.organization.findUnique({
    where: { Email: orgEmail },
    select: { id: true, Name: true, Email: true, Role: true, status: true },
  });

  if (existing) {
    console.log(`✅ Test organization already exists:`);
    console.log(`   ID: ${existing.id}`);
    console.log(`   Name: ${existing.Name}`);
    console.log(`   Email: ${existing.Email}`);
    console.log(`   Role: ${existing.Role}`);
    console.log(`   Status: ${existing.status}`);
    
    if (existing.status !== 'APPROVED') {
      const updated = await prisma.organization.update({
        where: { id: existing.id },
        data: { status: 'APPROVED' },
        select: { id: true, Name: true, Email: true, Role: true, status: true },
      });
      console.log(`\n✅ Updated status to APPROVED (was ${existing.status})`);
      return updated;
    }
    return existing;
  }

  const hashedPassword = await hashPassword(orgPassword);

  const created = await prisma.organization.create({
    data: {
      Name: orgName,
      Email: orgEmail,
      Password_Hashed: hashedPassword,
      Role: orgRole,
      subdomain: orgSubdomain,
      status: 'APPROVED',
      Phone: '+1-555-0100',
      Address: '123 Academy Street, Education City',
      Founded: new Date('2020-01-15'),
      Description: 'Test organization for development and testing',
    },
    select: {
      id: true,
      Name: true,
      Email: true,
      Role: true,
      status: true,
      subdomain: true,
      Phone: true,
      Address: true,
      Founded: true,
      Description: true,
    },
  });

  console.log(`✅ Test organization created successfully:`);
  console.log(`   ID: ${created.id}`);
  console.log(`   Name: ${created.Name}`);
  console.log(`   Email: ${created.Email}`);
  console.log(`   Role: ${created.Role}`);
  console.log(`   Subdomain: ${created.subdomain}`);
  console.log(`   Status: ${created.status}`);
  console.log(`\n📝 Login credentials:`);
  console.log(`   Email: ${orgEmail}`);
  console.log(`   Password: ${orgPassword}`);

  return created;
};

setupTestOrganization()
  .catch((error) => {
    console.error('❌ Error setting up test organization:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
