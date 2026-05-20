import nodemailer from 'nodemailer';
import AppError from './appError.js';

let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = String(process.env.EMAIL_SECURE || 'false').toLowerCase() === 'true';
  const tlsRejectUnauthorized =
    String(process.env.EMAIL_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    throw new AppError('Email service is not configured', 500);
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    tls: {
      rejectUnauthorized: tlsRejectUnauthorized,
    },
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

export const sendPasswordResetEmail = async ({ to, name, resetLink, expiresMinutes }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!from) {
    throw new AppError('EMAIL_FROM is not configured', 500);
  }

  const subject = 'Learnova Password Reset';
  const safeName = name || 'there';

  const text = [
    `Hello ${safeName},`,
    '',
    'We received a request to reset your Learnova password.',
    `This link will expire in ${expiresMinutes} minutes.`,
    '',
    `Reset your password: ${resetLink}`,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>Hello ${safeName},</p>
    <p>We received a request to reset your Learnova password.</p>
    <p>This link will expire in <strong>${expiresMinutes} minutes</strong>.</p>
    <p><a href="${resetLink}">Reset your password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  await getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

export const sendOrgVerificationEmail = async ({ to, name, verificationLink }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!from) throw new AppError('EMAIL_FROM is not configured', 500);

  const safeName = name || 'there';
  const subject = 'Verify your Learnova organization email';

  const text = [
    `Hello ${safeName},`,
    '',
    'Thank you for registering on Learnova.',
    'Please verify your email address by clicking the link below.',
    'This link will expire in 24 hours.',
    '',
    `Verify your email: ${verificationLink}`,
    '',
    'If you did not create this account, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>Hello ${safeName},</p>
    <p>Thank you for registering on <strong>Learnova</strong>.</p>
    <p>Please verify your email address by clicking the button below.</p>
    <p>This link will expire in <strong>24 hours</strong>.</p>
    <p style="margin:24px 0;">
      <a href="${verificationLink}"
         style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
        Verify Email Address
      </a>
    </p>
    <p>Or copy this link: <a href="${verificationLink}">${verificationLink}</a></p>
    <p>If you did not create this account, you can ignore this email.</p>
  `;

  await getTransporter().sendMail({ from, to, subject, text, html });
};

export const sendOrgApprovedEmail = async ({ to, name }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!from) throw new AppError('EMAIL_FROM is not configured', 500);

  const safeName = name || 'there';
  const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : null;
  const subject = 'Your Learnova organization has been approved';

  const text = [
    `Hello ${safeName},`,
    '',
    'Great news! Your organization has been reviewed and approved on Learnova.',
    'You can now log in and start building your organization.',
    loginUrl ? `\nLogin here: ${loginUrl}` : '',
  ].join('\n');

  const html = `
    <p>Hello ${safeName},</p>
    <p>Great news! Your organization has been reviewed and <strong>approved</strong> on Learnova.</p>
    <p>You can now log in and start building your organization.</p>
    ${loginUrl ? `<p style="margin:24px 0;"><a href="${loginUrl}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Login to Learnova</a></p>` : ''}
  `;

  await getTransporter().sendMail({ from, to, subject, text, html });
};

export const sendOrgRejectedEmail = async ({ to, name, reason }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!from) throw new AppError('EMAIL_FROM is not configured', 500);

  const safeName = name || 'there';
  const subject = 'Your Learnova organization application was not approved';

  const text = [
    `Hello ${safeName},`,
    '',
    'After reviewing your organization registration, we were unable to approve your account at this time.',
    reason ? `\nReason: ${reason}` : '',
    '',
    'If you believe this is an error or have questions, please contact our support team.',
  ].join('\n');

  const html = `
    <p>Hello ${safeName},</p>
    <p>After reviewing your organization registration, we were unable to approve your account at this time.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>If you believe this is an error or have questions, please contact our support team.</p>
  `;

  await getTransporter().sendMail({ from, to, subject, text, html });
};
