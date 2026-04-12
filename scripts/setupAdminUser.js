import 'dotenv/config';
import prisma from '../src/utils/prisma.js';
import { hashPassword } from '../src/utils/hashPassword.js';

const setupAdminUser = async () => {
  const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@learnova.local').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const adminName = process.env.ADMIN_NAME || 'Admin User';

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, role: true },
  });

  if (existing) {
    if (existing.role === 'ADMIN') {
      const hashedPassword = await hashPassword(adminPassword);

      const updatedAdmin = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHashed: hashedPassword,
          email: adminEmail,
        },
        select: { id: true, email: true, role: true },
      });

      console.log(`Admin user already exists and password reset: ${updatedAdmin.email} (id=${updatedAdmin.id})`);
      return updatedAdmin;
    }

    const hashedPassword = await hashPassword(adminPassword);

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: 'ADMIN',
        passwordHashed: hashedPassword,
        email: adminEmail,
      },
      select: { id: true, email: true, role: true },
    });

    console.log(`Updated existing user to ADMIN and reset password: ${updated.email}`);
    return updated;
  }

  const hashedPassword = await hashPassword(adminPassword);

  const created = await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      passwordHashed: hashedPassword,
      role: 'ADMIN',
    },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log(`\nAdmin user created successfully\nEmail: ${created.email}\nPassword: ${adminPassword}\nRole: ${created.role}\n`);
  return created;
};

setupAdminUser()
  .catch((error) => {
    console.error('Failed to setup admin user:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
