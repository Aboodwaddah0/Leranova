import prisma from '../utils/prisma.js';
import { hashPassword } from '../utils/hashPassword.js';
import AppError from '../utils/appError.js';

const getAllOrganizations = async () => {
  return prisma.organization.findMany({
    select: { id: true, Name: true, Email: true, Phone: true, Founded: true, Address: true, PhoneNumber: true, Description: true, Role: true },
  });
};

const getOrganizationById = async (id) => {
  const org = await prisma.organization.findUnique({
    where: { id: Number(id) },
    select: { id: true, Name: true, Email: true, Phone: true, Founded: true, Address: true, PhoneNumber: true, Description: true, Role: true },
  });
  if (!org) throw new AppError('Organization not found', 404);
  return org;
};

const createOrganization = async ({ Name, Email, Password, Phone, Founded, Address, PhoneNumber, Description, Role }) => {
  const existing = await prisma.organization.findUnique({ where: { Email } });
  if (existing) throw new AppError('Email already in use', 409);

  const Password_Hashed = await hashPassword(Password);
  const org = await prisma.organization.create({
    data: { Name, Email, Password_Hashed, Phone, Founded, Address, PhoneNumber, Description, Role },
  });

  const { Password_Hashed: _, ...safeOrg } = org;
  return safeOrg;
};

const updateOrganization = async (id, data) => {
  const org = await prisma.organization.findUnique({ where: { id: Number(id) } });
  if (!org) throw new AppError('Organization not found', 404);

  return prisma.organization.update({
    where: { id: Number(id) },
    data,
    select: { id: true, Name: true, Email: true, Phone: true, Address: true, Description: true, Role: true },
  });
};

const deleteOrganization = async (id) => {
  const org = await prisma.organization.findUnique({ where: { id: Number(id) } });
  if (!org) throw new AppError('Organization not found', 404);

  await prisma.organization.delete({ where: { id: Number(id) } });
};

export { getAllOrganizations, getOrganizationById, createOrganization, updateOrganization, deleteOrganization };
