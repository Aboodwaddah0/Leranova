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

export const createRegistrationCheckoutSession = async ({
  organization,
  plan,
  subscription,
  payment,
}) => {
  const stripe = getStripeClient();

  const successUrl =
    process.env.STRIPE_CHECKOUT_SUCCESS_URL ||
    'http://localhost:5173/payment/success?session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl =
    process.env.STRIPE_CHECKOUT_CANCEL_URL ||
    'http://localhost:5173/payment/cancel';

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
