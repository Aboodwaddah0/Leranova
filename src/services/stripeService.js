import Stripe from 'stripe';
import AppError from '../utils/appError.js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const ensureStripeConfigured = () => {
  if (!stripeSecretKey) {
    throw new AppError(
      'Payment setup is incomplete on the server (missing STRIPE_SECRET_KEY). Register without selecting a paid plan, or configure Stripe in backend .env.',
      400,
    );
  }
};

const getStripeClient = () => {
  ensureStripeConfigured();

  return new Stripe(stripeSecretKey);
};

const amountToCents = (amount) => {
  const parsed = Number.parseFloat(String(amount));
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new AppError('Invalid plan amount for Stripe checkout', 400);
  }

  return Math.round(parsed * 100);
};

export const createPlanSubscriptionCheckoutSession = async ({
  organization,
  plan,
  subscription,
  payment,
}) => {
  const stripe = getStripeClient();

  const successUrl =
    process.env.STRIPE_PLAN_CHECKOUT_SUCCESS_URL ||
    'http://localhost:5173/organization/billing/success?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl =
    process.env.STRIPE_PLAN_CHECKOUT_CANCEL_URL ||
    'http://localhost:5173/organization/billing/cancel';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: organization.Email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountToCents(plan.price),
          product_data: {
            name: `${plan.name} Plan`,
            description: plan.description || `Subscription for ${plan.durationDays} days`,
          },
        },
      },
    ],
    metadata: {
      type: 'PLAN_SUBSCRIPTION',
      organizationId: String(organization.id),
      subscriptionId: String(subscription.id),
      paymentId: String(payment.id),
      planId: String(plan.id),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
};

export const constructStripeEvent = (rawBody, signature) => {
  if (!webhookSecret) {
    throw new AppError('Stripe webhook is not configured. Missing STRIPE_WEBHOOK_SECRET', 500);
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
};

/**
 * إنشاء جلسة دفع Stripe لكورس معين
 * @param {object} data - البيانات المطلوبة
 * @param {number} data.userId - معرف الطالب الأكاديمي
 * @param {number} data.courseId - معرف الكورس
 * @param {string} data.courseName - اسم الكورس
 * @param {number} data.amount - المبلغ المراد دفعه
 * @param {string} data.userEmail - البريد الإلكتروني للطالب
 * @returns {Promise<object>} جلسة Stripe
 */
export const createCourseCheckoutSession = async ({
  userId,
  courseId,
  courseName,
  amount,
  userEmail,
  organizationId,
}) => {
  const stripe = getStripeClient();

  const successUrl =
    process.env.STRIPE_CHECKOUT_SUCCESS_URL ||
    'http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl =
    process.env.STRIPE_CHECKOUT_CANCEL_URL ||
    'http://localhost:5173/payment/cancel';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: userEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountToCents(amount),
          product_data: {
            name: courseName,
            description: `Course enrollment payment`,
          },
        },
      },
    ],
    metadata: {
      userId: String(userId),
      courseId: String(courseId),
      organizationId: String(organizationId),
      type: 'COURSE_PAYMENT',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
};

export const createSubjectCheckoutSession = async ({
  userId,
  subjectId,
  subjectName,
  subjectImage,
  amount,
  userEmail,
  organizationId,
  courseId,
}) => {
  const stripe = getStripeClient();

  // Use a dedicated success URL for subject subscriptions so it doesn't
  // conflict with the organization-registration success page.
  const successUrl =
    process.env.STRIPE_SUBJECT_SUCCESS_URL ||
    'http://localhost:5173/student/payment-success?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl =
    process.env.STRIPE_CHECKOUT_CANCEL_URL ||
    'http://localhost:5173/payment/cancel';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: userEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountToCents(amount),
          product_data: {
            name: subjectName,
            description: 'Academy subject subscription payment',
            ...(subjectImage ? { images: [subjectImage] } : {}),
          },
        },
      },
    ],
    metadata: {
      userId: String(userId),
      subjectId: String(subjectId),
      organizationId: String(organizationId),
      courseId: String(courseId),
      type: 'SUBJECT_SUBSCRIPTION',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
};

export const retrieveCheckoutSession = async (sessionId) => {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
};
