import crypto from 'crypto';
import AppError from './appError.js';

const RESET_TOKEN_BYTES = 32;

export const hashPasswordResetToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

export const generatePasswordResetToken = () => {
  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  const tokenHash = hashPasswordResetToken(token);

  return { token, tokenHash };
};

export const buildPasswordResetLink = (token) => {
  const baseUrl = process.env.PASSWORD_RESET_URL_BASE;

  if (!baseUrl) {
    throw new AppError('PASSWORD_RESET_URL_BASE is not configured', 500);
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
};
