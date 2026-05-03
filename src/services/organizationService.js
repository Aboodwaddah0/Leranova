import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { hashPassword } from '../utils/hashPassword.js';
import { ensureSchoolClassesForOrg, normalizeClassRanges } from './schoolClassService.js';
import { getOrCreateSchoolSettings } from './schoolSettingsService.js';

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
  await getOrganizationById(organizationId);

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

export const getOrganizationRevenue = async (organizationId) => {
  const courses = await prisma.course.findMany({
    where: { Org_id: organizationId },
    select: {
      id: true,
      Name: true,
      price: true,
      isPaid: true,
    },
  });

  const courseIds = courses.map((course) => course.id);

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
    prisma.student_course_payment.aggregate({
      where: {
        status: 'SUCCESS',
        Course_id: { in: courseIds },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.student_course_payment.findMany({
      where: {
        status: 'SUCCESS',
        Course_id: { in: courseIds },
      },
      include: {
        course: {
          select: {
            id: true,
            Name: true,
          },
        },
        academy_user: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
      take: 10,
    }),
    prisma.student_course_payment.groupBy({
      by: ['Course_id'],
      where: {
        status: 'SUCCESS',
        Course_id: { in: courseIds },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const courseMap = new Map(
    courses.map((course) => [
      course.id,
      {
        courseId: course.id,
        courseName: course.Name,
        isPaid: course.isPaid,
        price: course.price,
        revenue: 0,
        payments: 0,
      },
    ]),
  );

  for (const row of groupedPayments) {
    const entry = courseMap.get(row.Course_id);
    if (!entry) {
      continue;
    }

    entry.revenue = Number(row._sum.amount || 0);
    entry.payments = row._count?._all || 0;
  }

  return {
    totalRevenue: Number(aggregate._sum.amount || 0),
    totalPayments: aggregate._count?._all || 0,
    paidCoursesCount: courses.filter((course) => course.isPaid).length,
    freeCoursesCount: courses.filter((course) => !course.isPaid || Number(course.price || 0) === 0).length,
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      course: payment.course,
      student: payment.academy_user?.user || null,
    })),
    byCourse: Array.from(courseMap.values()).sort((a, b) => b.revenue - a.revenue),
  };
};

