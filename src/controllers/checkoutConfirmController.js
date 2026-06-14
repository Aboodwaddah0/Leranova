import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { retrieveCheckoutSession } from '../services/stripeService.js';

const ts = () => new Date().toISOString();

const parseId = (v) => {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isNaN(n) ? null : n;
};

/**
 * Fulfil a completed Stripe PLAN_SUBSCRIPTION checkout session.
 * Called by the frontend on the /organization/billing/success redirect as a
 * fallback for when the webhook hasn't fired yet (common in local development).
 * This function is fully idempotent — safe to call multiple times.
 */
const fulfilPlanSubscriptionSession = async (session) => {
  const metadata      = session.metadata || {};
  const paymentId     = parseId(metadata.paymentId);
  const subscriptionId= parseId(metadata.subscriptionId);

  if (!paymentId || !subscriptionId) return;

  // Check current status — skip if already fulfilled
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { status: true } });
  if (!payment) return;

  if (payment.status === 'SUCCESS') {
    // Already fulfilled by webhook — nothing to do
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data:  { status: 'SUCCESS', paymentMethod: 'STRIPE', paymentDate: new Date() },
    });

    const subscription = await tx.subscription.findUnique({
      where:  { id: subscriptionId },
      select: { organizationId: true },
    });

    if (subscription) {
      await tx.subscription.updateMany({
        where: {
          organizationId: subscription.organizationId,
          status: 'ACTIVE',
          NOT: { id: subscriptionId },
        },
        data: { status: 'CANCELLED' },
      });
    }

    await tx.subscription.update({
      where: { id: subscriptionId },
      data:  { status: 'ACTIVE' },
    });
  });
};

export const confirmCheckoutController = async (req, res, next) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return next(new AppError('session_id is required', 400));

    let session;
    try {
      session = await retrieveCheckoutSession(session_id);
    } catch {
      return next(new AppError('Invalid or expired Stripe session', 400));
    }

    // Only fulfil completed plan-subscription payments
    const sessionType = String(session?.metadata?.type || '').toUpperCase();

    if (sessionType === 'PLAN_SUBSCRIPTION' && session.payment_status === 'paid') {
      await fulfilPlanSubscriptionSession(session);
    }

    // Return current org status so the frontend can show the right message
    const organizationId = parseId(session?.metadata?.organizationId);
    let orgStatus = null;
    let trialEndsAt = null;
    if (organizationId) {
      const org = await prisma.organization.findUnique({
        where:  { id: organizationId },
        select: { status: true, Name: true, trialEndsAt: true },
      });
      orgStatus = org?.status ?? null;
      trialEndsAt = org?.trialEndsAt ?? null;
    }

    return res.status(200).json({
      success:   true,
      status:    200,
      data:      {
        paymentStatus: session.payment_status,
        sessionType:   sessionType || 'REGISTRATION',
        orgStatus,
        trialEndsAt,
        fulfilled: sessionType === 'PLAN_SUBSCRIPTION' && session.payment_status === 'paid',
      },
      error:     null,
      timestamp: ts(),
    });
  } catch (err) {
    next(err);
  }
};
