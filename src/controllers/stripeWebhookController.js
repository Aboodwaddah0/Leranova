import prisma from '../utils/prisma.js';
import { constructStripeEvent } from '../services/stripeService.js';

const parseMetadataId = (value) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const markPaymentSucceeded = async (metadata) => {
  const paymentId = parseMetadataId(metadata.paymentId);
  const subscriptionId = parseMetadataId(metadata.subscriptionId);

  if (!paymentId || !subscriptionId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        paymentMethod: 'STRIPE',
        paymentDate: new Date(),
      },
    });

    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
      },
    });
  });
};

const markPaymentFailed = async (metadata) => {
  const paymentId = parseMetadataId(metadata.paymentId);
  const subscriptionId = parseMetadataId(metadata.subscriptionId);

  if (!paymentId || !subscriptionId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        paymentMethod: 'STRIPE',
      },
    });

    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELED',
      },
    });
  });
};

export const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ message: 'Missing Stripe signature header' });
  }

  let event;

  try {
    event = constructStripeEvent(req.body, signature);
  } catch (error) {
    return res.status(400).json({ message: `Webhook signature error: ${error.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await markPaymentSucceeded(session.metadata || {});
    }

    if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      await markPaymentFailed(session.metadata || {});
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
