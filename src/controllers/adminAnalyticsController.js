import prisma from '../utils/prisma.js';

const toNumber = (value) => Number(value || 0);
const collectedStatuses = ['SUCCESS', 'PAID', 'SUCCEEDED', 'COMPLETED'];
const excludedRevenueStatuses = ['FAILED', 'CANCELLED', 'REFUNDED', 'VOID'];

export const getDashboardMetrics = async (_req, res, next) => {
  try {
    const [totalOrganizations, pendingOrganizations, approvedOrganizations, totalPlans, activeSubscriptions, totalRevenue, totalPayments] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'PENDING' } }),
      prisma.organization.count({ where: { status: 'APPROVED' } }),
      prisma.plan.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.aggregate({
        where: {
          status: {
            notIn: excludedRevenueStatuses,
          },
        },
        _sum: { amount: true },
      }),
      prisma.payment.count(),
    ]);

    return res.status(200).json({
      message: 'Dashboard metrics retrieved successfully',
      data: {
        totalOrganizations,
        pendingOrganizations,
        approvedOrganizations,
        totalPlans,
        activeSubscriptions,
        totalRevenue: toNumber(totalRevenue._sum.amount),
        totalPayments,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const days = Math.max(7, Number(req.query.days || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const payments = await prisma.payment.findMany({
      where: {
        status: {
          notIn: excludedRevenueStatuses,
        },
        paymentDate: { gte: since },
      },
      orderBy: { paymentDate: 'asc' },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMethod: true,
        status: true,
        organization: { select: { id: true, Name: true, Email: true } },
        subscription: { select: { id: true, plan: { select: { id: true, name: true } } } },
      },
    });

    const byDate = {};
    const byPlan = {};
    const byStatus = {};

    let collectedRevenue = 0;
    let pendingRevenue = 0;

    for (const payment of payments) {
      const dateKey = payment.paymentDate.toISOString().slice(0, 10);
      const planName = payment.subscription?.plan?.name || 'Unknown';
      const amount = toNumber(payment.amount);
      const normalizedStatus = String(payment.status || '').toUpperCase();

      byDate[dateKey] = (byDate[dateKey] || 0) + amount;
      byPlan[planName] = (byPlan[planName] || 0) + amount;
      byStatus[normalizedStatus || 'UNKNOWN'] = (byStatus[normalizedStatus || 'UNKNOWN'] || 0) + amount;

      if (collectedStatuses.includes(normalizedStatus)) {
        collectedRevenue += amount;
      } else {
        pendingRevenue += amount;
      }
    }

    return res.status(200).json({
      message: 'Revenue analytics retrieved successfully',
      data: {
        days,
        totalRevenue: payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
        collectedRevenue,
        pendingRevenue,
        totalPayments: payments.length,
        byDate,
        byPlan,
        byStatus,
        recentPayments: payments.slice(-10).reverse(),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getOrganizationAnalytics = async (req, res, next) => {
  try {
    const skip = Math.max(0, Number(req.query.skip || 0));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const status = String(req.query.status || '').trim().toUpperCase();
    const search = String(req.query.search || '').trim();

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { Name: { contains: search } },
        { Email: { contains: search } },
        { subdomain: { contains: search } },
      ];
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          Name: true,
          subdomain: true,
          Email: true,
          Role: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              course: true,
              student: true,
              teacher: true,
              academy_user: true,
              subscriptions: true,
              payments: true,
            },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return res.status(200).json({
      message: 'Organizations analytics retrieved successfully',
      data: {
        organizations,
        total,
        skip,
        limit,
      },
    });
  } catch (error) {
    return next(error);
  }
};
