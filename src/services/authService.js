import prisma from '../utils/prisma.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import generateToken from '../utils/generateToken.js';
import AppError from '../utils/appError.js';
import { createLoginCode, verifyLoginCode } from './loginCodeService.js';
import { sendLoginCode, sendOAuthWelcomeEmail } from './emailService.js';

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

// Teacher/Student step 1: verify password and send OTP to email.
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

  const code = await createLoginCode(user.id);
  await sendLoginCode(user.email, code, user.name);

  return {
    success: true,
    message: 'OTP sent to your email',
    data: {
      email: user.email,
      role: user.role,
    },
  };
};

// Teacher/Student step 2: verify OTP and issue JWT.
export const verifyLoginCodeAndGenerateToken = async ({ email, code }) => {
  if (!email || !code) {
    throw new AppError('Email and code are required', 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role !== 'TEACHER' && user.role !== 'STUDENT') {
    throw new AppError('This login flow is only for teacher and student', 403);
  }

  await verifyLoginCode(user.id, code);

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

export const sendLoginCodeToUser = async ({ email, password }) => {
  return loginUser({ email, password });
};

export const handleGoogleOAuthCallback = async (profile) => {
  if (!profile?.id) {
    throw new AppError('Invalid OAuth profile', 400);
  }

  let organization = await prisma.organization.findUnique({
    where: { oauthId: profile.id },
  });

  if (organization) {
    return organization;
  }

  const email = profile.emails?.[0]?.value;
  const existingByEmail = email
    ? await prisma.organization.findUnique({ where: { Email: email } })
    : null;

  if (existingByEmail) {
    throw new AppError('Email already registered. Please use organization login.', 400);
  }

  organization = await prisma.organization.create({
    data: {
      Name: profile.displayName ?? 'Organization',
      Email: email || `${profile.id}@oauth.learnova.com`,
      Password_Hashed: '',
      Role: 'ACADEMY',
      status: 'PENDING',
      oauthProvider: 'google',
      oauthId: profile.id,
      Description: 'Organization registered via Google OAuth',
    },
  });

  try {
    await sendOAuthWelcomeEmail(organization.Email, organization.Name, 'Organization');
  } catch (error) {
    console.error('Failed to send OAuth welcome email:', error);
  }

  return organization;
};
