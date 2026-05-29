import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import generateToken from '../utils/generateToken.js';
import AppError from '../utils/appError.js';
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  buildPasswordResetLink,
} from '../utils/passwordReset.js';
import { sendPasswordResetEmail, sendOrgVerificationEmail, sendOrgApprovedEmail } from '../utils/emailService.js';
import {
  createRegistrationCheckoutSession,
  ensureStripeConfigured,
} from './stripeService.js';
import { ensureSchoolClassesForOrg, normalizeClassRanges } from './schoolClassService.js';
import { getOrCreateSchoolSettings } from './schoolSettingsService.js';
import { isBusinessEmail } from '../utils/domainCheck.js';

const PASSWORD_RESET_EXPIRY_MINUTES = 15;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 72;
const normalizePortal = (portal) => String(portal || '').trim().toLowerCase();
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
  const normalizedPortal = normalizePortal(data.portal);
  const normalizedPlanId = Number(data.planId);
  const hasSelectedPlan = Number.isInteger(normalizedPlanId) && normalizedPlanId > 0;

  // Validate classRanges for school organizations
  if (normalizedRole === 'SCHOOL') {
    if (!Array.isArray(data.classRanges) || data.classRanges.length === 0) {
      throw new AppError('classRanges is required for school organizations and must contain at least one range', 400);
    }
  }

  const existingOrganization = await prisma.organization.findUnique({
    where: { Email: data.Email },
  });

  if (existingOrganization) {
    throw new AppError('Organization email already exists', 400);
  }

  const existingPortal = await prisma.organization.findUnique({
    where: { portal: normalizedPortal },
    select: { id: true },
  });

  if (existingPortal) {
    throw new AppError('Organization portal already exists', 400);
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

    if (Number(selectedPlan.price) > 0) {
      ensureStripeConfigured();
    }
  }

  const hashedPassword = await hashPassword(data.password);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        Name: data.Name,
        portal: normalizedPortal,
        Email: data.Email,
        Password_Hashed: hashedPassword,
        Phone: data.Phone ?? null,
        Founded: data.Founded ? new Date(data.Founded) : null,
        Address: data.Address ?? null,
        PhoneNumber: data.PhoneNumber ?? null,
        Description: data.Description ?? null,
        Role: normalizedRole,
        status: 'PENDING',
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000),
      },
      select: {
        id: true,
        Name: true,
        portal: true,
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

    if (normalizedRole === 'SCHOOL') {
      const classRanges = normalizeClassRanges(data.classRanges);
      await getOrCreateSchoolSettings(organization.id, tx);

      if (classRanges.length > 0) {
        await tx.organization_school_settings.update({
          where: { OrgId: organization.id },
          data: { classRanges },
        });

        await ensureSchoolClassesForOrg(organization.id, classRanges, tx);
      }
    }

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

  const verificationBaseUrl = process.env.EMAIL_VERIFICATION_URL_BASE;
  if (verificationBaseUrl) {
    const verificationLink = `${verificationBaseUrl}/${verificationToken}`;
    await sendOrgVerificationEmail({
      to: result.organization.Email,
      name: result.organization.Name,
      verificationLink,
    }).catch((err) => console.error('[EMAIL] Verification email failed:', err.message));
  }

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

export const verifyOrganizationEmail = async (token) => {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new AppError('Verification token is required', 400);
  }

  const organization = await prisma.organization.findFirst({
    where: { emailVerificationToken: normalizedToken },
    select: {
      id: true,
      Email: true,
      Name: true,
      status: true,
      emailVerificationExpiresAt: true,
    },
  });

  if (!organization) {
    throw new AppError('This verification link has already been used or is invalid. If you have already verified your email, please log in.', 400);
  }

  if (organization.emailVerificationExpiresAt < new Date()) {
    throw new AppError('This verification link has expired. Please contact support or register again with a new email.', 400);
  }

  if (organization.status !== 'PENDING') {
    return {
      message: 'Email already verified.',
      autoApproved: organization.status === 'APPROVED',
    };
  }

  const businessEmail = isBusinessEmail(organization.Email);
  const newStatus = businessEmail ? 'APPROVED' : 'EMAIL_VERIFIED';

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      status: newStatus,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  if (businessEmail) {
    await sendOrgApprovedEmail({ to: organization.Email, name: organization.Name }).catch(() => {});
    return {
      message: 'Email verified. Your organization has been automatically approved. You can now log in.',
      autoApproved: true,
    };
  }

  return {
    message: 'Email verified. Your account is pending admin review. You will receive an email once approved.',
    autoApproved: false,
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
    throw new AppError('Organization account is not active yet', 403);
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
      portal: organization.portal,
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

// Teacher/Student login with email/registrationNumber and password.
export const loginUser = async ({ email, registrationNumber, password, role }) => {
  if (!email && !registrationNumber) {
    throw new AppError('Email or registration number is required', 400);
  }

  const requestedRole = normalizeRequestedUserRole(role);

  const userInclude = {
    student: {
      include: {
        organization: {
          select: { id: true, Name: true, Role: true },
        },
      },
    },
    academy_user: {
      include: {
        organization: {
          select: { id: true, Name: true, Role: true },
        },
      },
    },
    teacher: {
      include: {
        organization: {
          select: { id: true, Name: true, Role: true },
        },
      },
    },
    parent: true,
  };

  let user;

  if (registrationNumber) {
    user = await prisma.user.findUnique({
      where: { registrationNumber: String(registrationNumber).trim() },
      include: userInclude,
    });
    if (!user || user.role !== 'STUDENT') {
      throw new AppError('Invalid registration number or password', 401);
    }
  } else {
    user = await prisma.user.findUnique({
      where: { email },
      include: userInclude,
    });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }
  }

  if (!['TEACHER', 'STUDENT', 'ADMIN', 'PARENT'].includes(user.role)) {
    throw new AppError('This login flow is only for teachers, students, parents, and admins', 403);
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
      mustChangePassword: user.mustChangePassword ?? false,
      organizationType: user.student?.organization?.Role || user.academy_user?.organization?.Role || user.teacher?.organization?.Role || null,
      organization: user.student?.organization || user.academy_user?.organization || user.teacher?.organization || null,
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
      parent: user.parent ? { parentId: user.parent.Parent_id } : null,
    },
    token,
  };
};

export const loginParent = async ({ email, password }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { parent: true },
  });

  if (!user || user.role !== 'PARENT' || !user.parent) {
    throw new AppError('Invalid email or password', 401);
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
      mustChangePassword: user.mustChangePassword ?? false,
      nationalId: user.parent.nationalId,
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

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      address: true,
      age: true,
      gender: true,
    },
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
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
      mustChangePassword: false,
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
