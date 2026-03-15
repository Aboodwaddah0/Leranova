import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { hashPassword } from '../utils/hashPassword.js';

const organizationSelect = {
  id: true,
  Name: true,
  Email: true,
  Phone: true,
  Founded: true,
  Address: true,
  PhoneNumber: true,
  Description: true,
  Role: true,
  status: true,
};

export const createOrganization = async (data) => {
  const existingOrganization = await prisma.organization.findUnique({
    where: {
      Email: data.Email,
    },
  });

  if (existingOrganization) {
    throw new AppError('Organization email already exists', 400);
  }

  const hashedPassword = await hashPassword(data.password);

  const organization = await prisma.organization.create({
    data: {
      Name: data.Name,
      Email: data.Email,
      Password_Hashed: hashedPassword,
      Phone: data.Phone ?? null,
      Founded: data.Founded ? new Date(data.Founded) : null,
      Address: data.Address ?? null,
      PhoneNumber: data.PhoneNumber ?? null,
      Description: data.Description ?? null,
      Role: data.Role,
      status: data.status ?? 'PENDING',
    },
    select: organizationSelect,
  });

  return organization;
};

export const getAllOrganizations = async (data) => {
  const organizations = await prisma.organization.findMany({
    skip: data?.skip ?? 0,
    take: data?.limit ?? 10,
    orderBy: {
      id: 'asc',
    },
    select: organizationSelect,
  });

  return organizations;
};

export const getOrganizationById = async (organizationId) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: organizationSelect,
  });

  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  return organization;
};

export const updateOrganization = async (organizationId, data) => {
  await getOrganizationById(organizationId);

  if (data.Email) {
    const emailOwner = await prisma.organization.findUnique({
      where: {
        Email: data.Email,
      },
      select: {
        id: true,
      },
    });

    if (emailOwner && emailOwner.id !== organizationId) {
      throw new AppError('Organization email already exists', 400);
    }
  }

  const updated = await prisma.organization.update({
    where: {
      id: organizationId,
    },
    data: {
      Name: data.Name,
      Email: data.Email,
      Password_Hashed: data.password ? await hashPassword(data.password) : undefined,
      Phone: data.Phone ?? undefined,
      Founded: data.Founded ? new Date(data.Founded) : undefined,
      Address: data.Address ?? undefined,
      PhoneNumber: data.PhoneNumber ?? undefined,
      Description: data.Description ?? undefined,
      Role: data.Role,
      status: data.status,
    },
    select: organizationSelect,
  });

  return updated;
};

export const deleteOrganization = async (organizationId) => {
  await getOrganizationById(organizationId);

  await prisma.organization.delete({
    where: {
      id: organizationId,
    },
  });

  return { id: organizationId };
};

