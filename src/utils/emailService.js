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
