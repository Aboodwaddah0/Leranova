import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import { retrieveCheckoutSession, refundPaymentIntent } from '../services/stripeService.js';

const ts = () => new Date().toISOString();

const parseId = (v) => {
  const n = Number.parseInt(String(v || ''), 10);
  return Number.isNaN(n) ? null : n;
};

/**
 * Fulfil a completed Stripe registration checkout session.
 * Called by the frontend on the /payment-success redirect as a fallback
 * for when the webhook hasn't fired yet (common in local development).
 * This function is fully idempotent — safe to call multiple times.
 */
const fulfilSession = async (session) => {
  const metadata      = session.metadata || {};
  const paymentId     = parseId(metadata.paymentId);
  const subscriptionId= parseId(metadata.subscriptionId);
  const organizationId= parseId(metadata.organizationId);

  if (!paymentId || !subscriptionId || !organizationId) return;

  // Check current status — skip if already fulfilled
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { status: true } });
  if (!payment) return;

  if (payment.status === 'SUCCESS' || payment.status === 'REFUNDED') {
    // Already fulfilled by webhook — nothing to do
    return;
  }

  // Mark payment + subscription + org in one transaction
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data:  { status: 'SUCCESS', paymentMethod: 'STRIPE', paymentDate: new Date() },
    });

    const subscription = await tx.subscription.findUnique({
      where:  { id: subscriptionId },
      select: { organizationId: true },
    });

    await tx.subscription.update({
      where: { id: subscriptionId },
      data:  { status: 'ACTIVE' },
    });
    // Do NOT change org status here — org must go through email verification
    // then admin approval before becoming APPROVED.
  });

  // Issue trial refund (fire-and-forget)
  if (session.payment_intent) {
    try {
      await refundPaymentIntent(session.payment_intent);
      await prisma.payment.update({ where: { id: paymentId }, data: { status: 'REFUNDED' } });
    } catch (err) {
      console.error('[Confirm] Trial refund failed:', err.message);
    }
  }
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
    const isPlanPayment = !sessionType || (sessionType !== 'SUBJECT_SUBSCRIPTION' && sessionType !== 'COURSE_PAYMENT');

    if (isPlanPayment && session.payment_status === 'paid') {
      await fulfilSession(session);
    }

    // Return current org status so the frontend can show the right message
    const organizationId = parseId(session?.metadata?.organizationId);
    let orgStatus = null;
    if (organizationId) {
      const org = await prisma.organization.findUnique({
        where:  { id: organizationId },
        select: { status: true, Name: true },
      });
      orgStatus = org?.status ?? null;
    }

    return res.status(200).json({
      success:   true,
      status:    200,
      data:      {
        paymentStatus: session.payment_status,
        sessionType:   sessionType || 'REGISTRATION',
        orgStatus,
        fulfilled: session.payment_status === 'paid',
      },
      error:     null,
      timestamp: ts(),
    });
  } catch (err) {
    next(err);
  }
};
