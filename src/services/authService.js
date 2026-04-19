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
import {
  createRegistrationCheckoutSession,
  ensureStripeConfigured,
} from './stripeService.js';

const PASSWORD_RESET_EXPIRY_MINUTES = 15;
const normalizeSubdomain = (subdomain) => String(subdomain || '').trim().toLowerCase();
const normalizeNationalId = (nationalId) => String(nationalId || '').trim().replace(/[\s-]/g, '');
const normalizeRequestedUserRole = (role) => {
  const normalizedRole = String(role || '').trim().toUpperCase();

  if (!normalizedRole) {
    return null;
  }

  if (normalizedRole === 'INSTRUCTOR') {
    return 'TEACHER';
  }

  return normalizedRole;
};

export const registerOrganization = async (data) => {
  const normalizedRole = String(data.Role || '').trim().toUpperCase();
  const normalizedSubdomain = normalizeSubdomain(data.subdomain);
  const normalizedPlanId = Number(data.planId);
  const hasSelectedPlan = Number.isInteger(normalizedPlanId) && normalizedPlanId > 0;

  const existingOrganization = await prisma.organization.findUnique({
    where: { Email: data.Email },
  });

  if (existingOrganization) {
    throw new AppError('Organization email already exists', 400);
  }

  const existingSubdomain = await prisma.organization.findUnique({
    where: { subdomain: normalizedSubdomain },
    select: { id: true },
  });

  if (existingSubdomain) {
    throw new AppError('Organization subdomain already exists', 400);
  }

  let selectedPlan = null;

  if (hasSelectedPlan) {
    selectedPlan = await prisma.plan.findUnique({
      where: { id: normalizedPlanId },
      select: {
        id: true,
        name: true,
        price: true,
        durationDays: true,
        description: true,
      },
    });

    if (!selectedPlan) {
      throw new AppError('Selected plan not found', 404);
    }

    ensureStripeConfigured();
  }

  const hashedPassword = await hashPassword(data.password);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        Name: data.Name,
        subdomain: normalizedSubdomain,
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
        subdomain: true,
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

    if (!selectedPlan) {
      return {
        organization,
        plan: null,
        subscription: null,
        payment: null,
      };
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + selectedPlan.durationDays);

    const subscription = await tx.subscription.create({
      data: {
        organizationId: organization.id,
        planId: selectedPlan.id,
        startDate,
        endDate,
        status: 'PENDING',
        autoRenew: true,
      },
      select: {
        id: true,
        organizationId: true,
        planId: true,
        startDate: true,
        endDate: true,
        status: true,
        autoRenew: true,
        createdAt: true,
      },
    });

    const payment = await tx.payment.create({
      data: {
        subscriptionId: subscription.id,
        organizationId: organization.id,
        amount: selectedPlan.price,
        paymentMethod: 'STRIPE',
        status: 'PENDING',
      },
      select: {
        id: true,
        subscriptionId: true,
        organizationId: true,
        amount: true,
        paymentDate: true,
        paymentMethod: true,
        status: true,
      },
    });

    return {
      organization,
      plan: selectedPlan,
      subscription,
      payment,
    };
  });

  if (!selectedPlan) {
    return {
      ...result,
      checkout: null,
    };
  }

  const checkoutSession = await createRegistrationCheckoutSession({
    organization: result.organization,
    plan: result.plan,
    subscription: result.subscription,
    payment: result.payment,
  });

  return {
    ...result,
    checkout: {
      sessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url,
      status: 'PENDING_PAYMENT',
    },
  };
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
      subdomain: organization.subdomain,
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
export const loginUser = async ({ email, password, role }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const requestedRole = normalizeRequestedUserRole(role);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      student: {
        include: {
          organization: {
            select: {
              id: true,
              Name: true,
              Role: true,
            },
          },
        },
      },
      academy_user: {
        include: {
          organization: {
            select: {
              id: true,
              Name: true,
              Role: true,
            },
          },
        },
      },
    },
  });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.role !== 'TEACHER' && user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    throw new AppError('This login flow is only for teacher, student, and admin', 403);
  }

  if (requestedRole && requestedRole !== user.role) {
    throw new AppError('Selected role does not match this account', 403);
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
      organizationType: user.student?.organization?.Role || user.academy_user?.organization?.Role || null,
      organization: user.student?.organization || user.academy_user?.organization || null,
      student: user.student
        ? {
            studentId: user.student.Student_id,
            orgId: user.student.OrgId,
            courseId: user.student.Course_id,
            gradeLevel: user.student.GradeLevel,
            academicStatus: user.student.AcademicStatus,
          }
        : null,
      academyUser: user.academy_user
        ? {
            orgId: user.academy_user.OrgId,
          }
        : null,
    },
    token,
  };
};

export const loginParent = async ({ nationalId, password }) => {
  const normalizedNationalId = normalizeNationalId(nationalId);

  if (!normalizedNationalId || !password) {
    throw new AppError('National ID and password are required', 400);
  }

  const parent = await prisma.parent.findUnique({
    where: { nationalId: normalizedNationalId },
    include: {
      user: true,
    },
  });

  if (!parent?.user) {
    throw new AppError('Invalid national ID or password', 401);
  }

  if (parent.user.role !== 'PARENT') {
    throw new AppError('Invalid national ID or password', 401);
  }

  const isPasswordValid = await comparePassword(password, parent.user.passwordHashed);
  if (!isPasswordValid) {
    throw new AppError('Invalid national ID or password', 401);
  }

  const token = generateToken({
    id: parent.user.id,
    name: parent.user.name,
    email: parent.user.email,
    role: parent.user.role,
  });

  return {
    user: {
      id: parent.user.id,
      name: parent.user.name,
      email: parent.user.email,
      role: parent.user.role,
      nationalId: parent.nationalId,
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

export const changePassword = async ({ userId, newPassword }) => {
  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new AppError('Invalid user session', 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  const user = await prisma.user.update({
    where: { id: normalizedUserId },
    data: {
      passwordHashed: hashedPassword,
      passwordChangedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return {
    user,
    message: 'Password updated successfully',
  };
};
