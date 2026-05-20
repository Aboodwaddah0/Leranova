import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { hashPassword } from '../utils/hashPassword.js';
import { ensureSchoolClassesForOrg, normalizeClassRanges } from './schoolClassService.js';
import { getOrCreateSchoolSettings } from './schoolSettingsService.js';
import { sendOrgApprovedEmail, sendOrgRejectedEmail } from '../utils/emailService.js';

const organizationSelect = {
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
  rejectionReason: true,
};

const normalizeOrganizationRole = (role) => String(role || '').trim().toUpperCase();
const normalizeSubdomain = (subdomain) => String(subdomain || '').trim().toLowerCase();

export const createOrganization = async (data) => {
  const normalizedSubdomain = normalizeSubdomain(data.subdomain);
  const normalizedRole = normalizeOrganizationRole(data.Role);
  
  // Validate classRanges for school organizations
  if (normalizedRole === 'SCHOOL') {
    if (!Array.isArray(data.classRanges) || data.classRanges.length === 0) {
      throw new AppError('classRanges is required for school organizations and must contain at least one range', 400);
    }
  }
  
  const normalizedClassRanges = normalizedRole === 'SCHOOL' ? normalizeClassRanges(data.classRanges) : [];

  const existingOrganization = await prisma.organization.findUnique({
    where: {
      Email: data.Email,
    },
  });

  if (existingOrganization) {
    throw new AppError('Organization email already exists', 400);
  }

  const existingSubdomain = await prisma.organization.findUnique({
    where: {
      subdomain: normalizedSubdomain,
    },
    select: {
      id: true,
    },
  });

  if (existingSubdomain) {
    throw new AppError('Organization subdomain already exists', 400);
  }

  const hashedPassword = await hashPassword(data.password);

  return prisma.$transaction(async (tx) => {
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
        status: data.status ?? 'PENDING',
      },
      select: organizationSelect,
    });

    if (normalizedRole === 'SCHOOL') {
      await getOrCreateSchoolSettings(organization.id, tx);

      if (normalizedClassRanges.length > 0) {
        await tx.organization_school_settings.update({
          where: { OrgId: organization.id },
          data: { classRanges: normalizedClassRanges },
        });

        await ensureSchoolClassesForOrg(organization.id, normalizedClassRanges, tx);
      }
    }

    return organization;
  });
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
  const existing = await getOrganizationById(organizationId);

  const normalizedSubdomain = data.subdomain ? normalizeSubdomain(data.subdomain) : undefined;

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

  if (normalizedSubdomain) {
    const subdomainOwner = await prisma.organization.findUnique({
      where: {
        subdomain: normalizedSubdomain,
      },
      select: {
        id: true,
      },
    });

    if (subdomainOwner && subdomainOwner.id !== organizationId) {
      throw new AppError('Organization subdomain already exists', 400);
    }
  }

  const updated = await prisma.organization.update({
    where: {
      id: organizationId,
    },
    data: {
      Name: data.Name,
      subdomain: normalizedSubdomain,
      Email: data.Email,
      Password_Hashed: data.password ? await hashPassword(data.password) : undefined,
      Phone: data.Phone ?? undefined,
      Founded: data.Founded ? new Date(data.Founded) : undefined,
      Address: data.Address ?? undefined,
      PhoneNumber: data.PhoneNumber ?? undefined,
      Description: data.Description ?? undefined,
      Role: data.Role ? normalizeOrganizationRole(data.Role) : undefined,
      status: data.status,
      rejectionReason: data.rejectionReason ?? undefined,
    },
    select: organizationSelect,
  });

  if (data.status && data.status !== existing.status) {
    if (data.status === 'APPROVED') {
      sendOrgApprovedEmail({ to: updated.Email, name: updated.Name }).catch(() => {});
    } else if (data.status === 'REJECTED') {
      sendOrgRejectedEmail({ to: updated.Email, name: updated.Name, reason: data.rejectionReason ?? null }).catch(() => {});
    }
  }

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

const PAID_SUBSCRIPTION_FILTER = {
  OR: [
    { paymentStatus: 'PAID' },
    { status: 'PAID' },
    { status: 'SUCCESS' },
  ],
};

export const getOrganizationRevenue = async (organizationId) => {
  const orgCourses = await prisma.course.findMany({
    where: { track: { Org_id: organizationId } },
    select: {
      id: true,
      name: true,
      price: true,
      isPaid: true,
    },
  });

  const courseIds = orgCourses.map((c) => c.id);

  if (courseIds.length === 0) {
    return {
      totalRevenue: 0,
      totalPayments: 0,
      paidCoursesCount: 0,
      freeCoursesCount: 0,
      recentPayments: [],
      byCourse: [],
    };
  }

  const [aggregate, recentPayments, groupedPayments] = await Promise.all([
    prisma.student_subject_subscription.aggregate({
      where: {
        Subject_id: { in: courseIds },
        ...PAID_SUBSCRIPTION_FILTER,
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.student_subject_subscription.findMany({
      where: {
        Subject_id: { in: courseIds },
        ...PAID_SUBSCRIPTION_FILTER,
      },
      include: {
        course: {
          select: { id: true, name: true },
        },
        academy_user: {
          select: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
      take: 10,
    }),
    prisma.student_subject_subscription.groupBy({
      by: ['Subject_id'],
      where: {
        Subject_id: { in: courseIds },
        ...PAID_SUBSCRIPTION_FILTER,
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const courseMap = new Map(
    orgCourses.map((c) => [
      c.id,
      {
        courseId: c.id,
        courseName: c.name,
        isPaid: c.isPaid,
        price: c.price,
        revenue: 0,
        payments: 0,
      },
    ]),
  );

  for (const row of groupedPayments) {
    const entry = courseMap.get(row.Subject_id);
    if (!entry) continue;
    entry.revenue = Number(row._sum.amount || 0);
    entry.payments = row._count?._all || 0;
  }

  return {
    totalRevenue: Number(aggregate._sum?.amount || 0),
    totalPayments: aggregate._count?._all || 0,
    paidCoursesCount: orgCourses.filter((c) => c.isPaid).length,
    freeCoursesCount: orgCourses.filter((c) => !c.isPaid || Number(c.price || 0) === 0).length,
    recentPayments: recentPayments.map((sub) => ({
      id: sub.id,
      amount: Number(sub.amount),
      status: sub.status,
      paymentMethod: sub.paymentMethod,
      paidAt: sub.paidAt,
      course: sub.course ? { id: sub.course.id, Name: sub.course.name } : null,
      student: sub.academy_user?.user || null,
    })),
    byCourse: Array.from(courseMap.values()).sort((a, b) => b.revenue - a.revenue),
  };
};

