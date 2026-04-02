import prisma from '../utils/prisma.js';

const EXPIRY_MINUTES = 15;
const MAX_ATTEMPTS = 5;

export const generateLoginCode = (length = 6) => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createLoginCode = async (userId) => {
  try {
    // Delete any existing unexpired codes for this user
    await prisma.login_code.updateMany({
      where: {
        userId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    });

    const code = generateLoginCode();
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

    const loginCode = await prisma.login_code.create({
      data: {
        userId,
        code,
        expiresAt,
        attempts: 0,
      },
    });

    return loginCode.code;
  } catch (error) {
    console.error('Error creating login code:', error);
    throw new Error('Failed to create login code');
  }
};

export const verifyLoginCode = async (userId, providedCode) => {
  try {
    const loginCode = await prisma.login_code.findFirst({
      where: {
        userId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!loginCode) {
      throw new Error('No valid login code found');
    }

    if (loginCode.attempts >= MAX_ATTEMPTS) {
      await prisma.login_code.update({
        where: { id: loginCode.id },
        data: { isUsed: true },
      });
      throw new Error('Maximum attempts exceeded. Please request a new code.');
    }

    if (loginCode.code !== providedCode) {
      await prisma.login_code.update({
        where: { id: loginCode.id },
        data: { attempts: loginCode.attempts + 1 },
      });
      throw new Error('Invalid login code');
    }

    // Mark code as used
    await prisma.login_code.update({
      where: { id: loginCode.id },
      data: { isUsed: true },
    });

    return true;
  } catch (error) {
    console.error('Error verifying login code:', error);
    throw error;
  }
};

export const invalidateLoginCode = async (userId) => {
  try {
    await prisma.login_code.updateMany({
      where: {
        userId,
        isUsed: false,
      },
      data: { isUsed: true },
    });
  } catch (error) {
    console.error('Error invalidating login code:', error);
  }
};

export const cleanupExpiredCodes = async () => {
  try {
    await prisma.login_code.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  } catch (error) {
    console.error('Error cleaning up expired codes:', error);
  }
};
