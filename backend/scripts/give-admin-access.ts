/**
 * Give Admin Access Script
 * 
 * Script to grant administrator privileges to a user
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function giveAdminAccess() {
  try {
    console.log('🔧 Granting admin access...');

    // Get user email from command line argument or prompt
    const userEmail = process.argv[2];
    
    if (!userEmail) {
      console.log('❌ Please provide a user email as an argument');
      console.log('Usage: npx tsx scripts/give-admin-access.ts <email>');
      console.log('Example: npx tsx scripts/give-admin-access.ts your-email@example.com');
      process.exit(1);
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        username: true,
        userTier: true
      }
    });

    if (!user) {
      console.log(`❌ User with email "${userEmail}" not found`);
      process.exit(1);
    }

    console.log(`👤 Found user: ${user.username} (${user.email})`);
    console.log(`📊 Current tier: ${user.userTier}`);

    if (user.userTier === 'ADMINISTRATOR') {
      console.log('✅ User already has administrator privileges');
      return;
    }

    // Update user tier to ADMINISTRATOR
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { userTier: 'ADMINISTRATOR' },
      select: {
        id: true,
        email: true,
        username: true,
        userTier: true
      }
    });

    console.log('✅ Successfully granted administrator privileges!');
    console.log(`👑 User: ${updatedUser.username}`);
    console.log(`📧 Email: ${updatedUser.email}`);
    console.log(`🎯 Tier: ${updatedUser.userTier}`);

    // Verify the change
    const verifyUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { userTier: true }
    });

    if (verifyUser?.userTier === 'ADMINISTRATOR') {
      console.log('✅ Verification successful - user now has admin access!');
    } else {
      console.log('❌ Verification failed - user tier was not updated');
    }

  } catch (error) {
    console.error('❌ Error granting admin access:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

giveAdminAccess();
