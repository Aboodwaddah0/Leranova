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

    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      select: { organizationId: true },
    });

    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
      },
    });

    if (subscription?.organizationId) {
      await tx.organization.update({
        where: { id: subscription.organizationId },
        data: { status: 'APPROVED' },
      });
    }
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

const markSubjectSubscriptionSucceeded = async (metadata) => {
    const stripeSessionId = String(metadata.stripeSessionId || '').trim() || null;

  const userId = parseMetadataId(metadata.userId);
  const subjectId = parseMetadataId(metadata.subjectId);
  const courseId = parseMetadataId(metadata.courseId);

  if (!userId || !subjectId || !courseId) {
    return;
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      Course_id: true,
      price: true,
    },
  });

  if (!subject || subject.Course_id !== courseId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.student_subject_subscription.upsert({
      where: {
        user_Academy_id_Subject_id: {
          user_Academy_id: userId,
          Subject_id: subjectId,
        },
      },
      update: {
        amount: subject.price,
        paymentMethod: 'STRIPE',
        paymentStatus: 'PAID',
        stripeSessionId,
        status: 'SUCCESS',
        paidAt: new Date(),
      },
      create: {
        user_Academy_id: userId,
        Subject_id: subjectId,
        amount: subject.price,
        paymentMethod: 'STRIPE',
        paymentStatus: 'PAID',
        stripeSessionId,
        status: 'SUCCESS',
        paidAt: new Date(),
      },
    });

    await tx.enrollment.upsert({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: userId,
          Course_id: courseId,
        },
      },
      update: {},
      create: {
        user_Academy_id: userId,
        Course_id: courseId,
      },
    });
  });
};

const markSubjectSubscriptionFailed = async (metadata) => {
  const userId = parseMetadataId(metadata.userId);
  const subjectId = parseMetadataId(metadata.subjectId);

  if (!userId || !subjectId) {
    return;
  }

  await prisma.student_subject_subscription.upsert({
    where: {
      user_Academy_id_Subject_id: {
        user_Academy_id: userId,
        Subject_id: subjectId,
      },
    },
    update: {
      paymentMethod: 'STRIPE',
        paymentStatus: 'PENDING',
      status: 'FAILED',
      paidAt: null,
    },
    create: {
      user_Academy_id: userId,
      Subject_id: subjectId,
      amount: 0,
      paymentMethod: 'STRIPE',
        paymentStatus: 'PENDING',
      status: 'FAILED',
      paidAt: null,
    },
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
      if (String(session?.metadata?.type || '').toUpperCase() === 'SUBJECT_SUBSCRIPTION') {
        await markSubjectSubscriptionSucceeded({
          ...(session.metadata || {}),
          stripeSessionId: session.id,
        });
      }
      await markPaymentSucceeded(session.metadata || {});
    }

    if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      if (String(session?.metadata?.type || '').toUpperCase() === 'SUBJECT_SUBSCRIPTION') {
        await markSubjectSubscriptionFailed(session.metadata || {});
      }
      await markPaymentFailed(session.metadata || {});
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
