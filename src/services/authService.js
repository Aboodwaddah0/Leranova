import prisma from '../utils/prisma.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import generateToken from '../utils/generateToken.js';
import AppError from '../utils/appError.js';
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  buildPasswordResetLink,
} from '../utils/passwordReset.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';

const PASSWORD_RESET_EXPIRY_MINUTES = 15;

export const registerOrganization = async (data) => {
  const normalizedRole = String(data.Role || '').trim().toUpperCase();

  const existingOrganization = await prisma.organization.findUnique({
    where: { Email: data.Email },
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
      Role: normalizedRole,
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
    where: { Email },
  });

  if (!organization) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await comparePassword(password, organization.Password_Hashed);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (organization.status !== 'APPROVED') {
    throw new AppError('Organization account is not approved yet', 403);
  }

  const token = generateToken({
    id: organization.id,
    name: organization.Name,
    email: organization.Email,
    role: organization.Role,
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

// Teacher/Student login with email and password.
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.role !== 'TEACHER' && user.role !== 'STUDENT') {
    throw new AppError('This login flow is only for teacher and student', 403);
  }

  const isPasswordValid = await comparePassword(password, user.passwordHashed);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

export const forgotPassword = async ({ email, accountType }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new AppError('Email is required', 400);
  }

  const rawAccountType = String(accountType || '').trim().toUpperCase();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
  const { token, tokenHash } = generatePasswordResetToken();

  let recipient = null;

  if (rawAccountType !== 'ORGANIZATION') {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      });

      recipient = {
        email: user.email,
        name: user.name,
      };
    }
  }

  if (!recipient && rawAccountType !== 'USER') {
    const organization = await prisma.organization.findUnique({
      where: { Email: normalizedEmail },
      select: { id: true, Email: true, Name: true },
    });

    if (organization) {
      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          PasswordResetToken: tokenHash,
          PasswordResetExpiresAt: expiresAt,
        },
      });

      recipient = {
        email: organization.Email,
        name: organization.Name,
      };
    }
  }

  if (!recipient) {
    return;
  }

  const resetLink = buildPasswordResetLink(token);
  await sendPasswordResetEmail({
    to: recipient.email,
    name: recipient.name,
    resetLink,
    expiresMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
  });
};

export const resetPassword = async ({ token, newPassword }) => {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new AppError('Token is required', 400);
  }

  const tokenHash = hashPasswordResetToken(normalizedToken);
  const now = new Date();

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: {
        gt: now,
      },
    },
    select: { id: true },
  });

  if (user) {
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHashed: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        passwordChangedAt: now,
      },
    });
    return;
  }

  const organization = await prisma.organization.findFirst({
    where: {
      PasswordResetToken: tokenHash,
      PasswordResetExpiresAt: {
        gt: now,
      },
    },
    select: { id: true },
  });

  if (organization) {
    const hashedPassword = await hashPassword(newPassword);
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        Password_Hashed: hashedPassword,
        PasswordResetToken: null,
        PasswordResetExpiresAt: null,
        PasswordChangedAt: now,
      },
    });
    return;
  }

  throw new AppError('Invalid or expired reset token', 400);
};
