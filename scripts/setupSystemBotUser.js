/**
 * System Bot User Setup
 * 
 * This script creates a special system bot user for storing chatbot messages.
 * Run this ONCE during initial setup or database initialization.
 * 
 * USAGE:
 *   node scripts/setupSystemBotUser.js
 */

import prisma from '../src/utils/prisma.js';

const SYSTEM_BOT_EMAIL = 'system-bot@learnova.local';
const SYSTEM_BOT_PASSWORD = 'SYSTEM_BOT_NO_LOGIN'; // Hashed, never used for login

async function setupSystemBotUser() {
  try {
    console.log('[SETUP] Starting system bot user initialization...');

    // Check if bot user already exists
    let botUser = await prisma.user.findUnique({
      where: { email: SYSTEM_BOT_EMAIL },
    });

    if (botUser) {
      console.log(`[SETUP] System bot user already exists: ID=${botUser.id}`);
      console.log(`[SETUP] Set SYSTEM_BOT_USER_ID=${botUser.id} in your .env file`);
      return botUser;
    }

    // Create system bot user
    botUser = await prisma.user.create({
      data: {
        email: SYSTEM_BOT_EMAIL,
        password: SYSTEM_BOT_PASSWORD,
        Name: 'Learnova Bot',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`[SETUP] ✓ System bot user created successfully`);
    console.log(`[SETUP] User ID: ${botUser.id}`);
    console.log(`[SETUP] Email: ${botUser.email}`);
    console.log(`[SETUP]`);
    console.log(`[SETUP] ACTION: Add this to your .env file:`);
    console.log(`[SETUP]   SYSTEM_BOT_USER_ID=${botUser.id}`);
    console.log(`[SETUP]`);

    return botUser;
  } catch (error) {
    console.error('[SETUP] Error creating system bot user:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
setupSystemBotUser()
  .then(() => {
    console.log('[SETUP] Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[SETUP] Setup failed:', error);
    process.exit(1);
  });
