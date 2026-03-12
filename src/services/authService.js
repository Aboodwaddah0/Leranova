import prisma from '../utils/prisma.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import generateToken from '../utils/generateToken.js';
import AppError from '../utils/appError.js';

export const registerOrganization = async (data) => {
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
      status: 'PENDING',
    },
    select: {
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
    },
  });

  return organization;
};

export const loginOrganization = async ({ Email, password }) => {
  const organization = await prisma.organization.findUnique({
    where: {
      Email,
    },
  });

  if (!organization) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await comparePassword(
    password,
    organization.Password_Hashed
  );

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (organization.status !== 'APPROVED') {
    throw new AppError('Organization account is not approved yet', 403);
  }

  const token = generateToken({
    id: organization.id,
    email: organization.Email,
    role: organization.Role,
    accountType: 'organization',
  });

  return {
    organization: {
      id: organization.id,
      Name: organization.Name,
      Email: organization.Email,
      Phone: organization.Phone,
      Founded: organization.Founded,
      Address: organization.Address,
      PhoneNumber: organization.PhoneNumber,
      Description: organization.Description,
      Role: organization.Role,
      status: organization.status,
    },
    token,
  };
};
