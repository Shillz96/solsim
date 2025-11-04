/**
 * Clear All Users Except Admin Script
 *
 * This script safely removes all users from the database except admin@admin.com.
 * It handles cascading deletions of related data like trades, positions, etc.
 *
 * Run with: npx tsx backend/scripts/clear-users-except-admin.ts
 */

import { PrismaClient } from '@prisma/client';

// Railway PostgreSQL connection
const DATABASE_URL = 'postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@metro.proxy.rlwy.net:13936/railway';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function clearUsersExceptAdmin() {
  console.log('🔍 Starting user cleanup - keeping only admin@admin.com...\n');

  try {
    // First, get the admin user to confirm it exists
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' },
      select: { id: true, email: true, handle: true }
    });

    if (!adminUser) {
      console.error('❌ Admin user (admin@admin.com) not found in database!');
      console.log('Please ensure the admin user exists before running this script.');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.email} (${adminUser.handle})`);

    // Get count of all users before deletion
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total users in database: ${totalUsers}`);

    if (totalUsers <= 1) {
      console.log('ℹ️  Only admin user exists. Nothing to delete.');
      return;
    }

    // Get users to be deleted (excluding admin)
    const usersToDelete = await prisma.user.findMany({
      where: {
        email: { not: 'admin@admin.com' }
      },
      select: { id: true, email: true, handle: true }
    });

    console.log(`🗑️  Users to be deleted: ${usersToDelete.length}`);
    
    if (usersToDelete.length === 0) {
      console.log('ℹ️  No users to delete.');
      return;
    }

    // Show some sample users to be deleted
    console.log('\n📋 Sample users to be deleted:');
    usersToDelete.slice(0, 10).forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.handle})`);
    });
    if (usersToDelete.length > 10) {
      console.log(`   ... and ${usersToDelete.length - 10} more`);
    }

    console.log('\n🗑️  Starting deletion process...');

    // Get user IDs to delete
    const userIdsToDelete = usersToDelete.map(u => u.id);

    // Delete in proper order to handle foreign key constraints
    // The Prisma schema should handle most cascading automatically, but we'll be explicit

    console.log('   Deleting user-related data...');

    // Delete chat-related data
    await prisma.chatMessage.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.chatModerationAction.deleteMany({
      where: { moderatorId: { in: userIdsToDelete } }
    });

    await prisma.userModerationStatus.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    // Delete trading-related data
    await prisma.trade.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.position.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.realizedPnL.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.perpPosition.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.perpTrade.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.liquidation.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    // Delete financial data
    await prisma.transactionHistory.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.conversionHistory.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.solPurchase.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.deposit.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.withdrawal.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    // Delete tracking and social data
    await prisma.walletTrack.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.walletTrackerSettings.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.copyTrade.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    await prisma.tokenWatch.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    // Delete badge system data
    await prisma.userBadge.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    // Delete wallet data
    await prisma.userWallet.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    // Delete rewards data
    await prisma.hourlyRewardPayout.deleteMany({
      where: { userId: { in: userIdsToDelete } }
    });

    console.log('   All related data deleted successfully');

    // Finally, delete the users themselves
    const deleteResult = await prisma.user.deleteMany({
      where: {
        email: { not: 'admin@admin.com' }
      }
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} users`);

    // Verify the result
    const remainingUsers = await prisma.user.count();
    console.log(`📊 Remaining users in database: ${remainingUsers}`);

    if (remainingUsers === 1) {
      const remainingUser = await prisma.user.findFirst({
        select: { email: true, handle: true }
      });
      console.log(`✅ Only user remaining: ${remainingUser?.email} (${remainingUser?.handle})`);
    }

    console.log('\n📈 Summary:');
    console.log(`   Users before: ${totalUsers}`);
    console.log(`   Users deleted: ${deleteResult.count}`);
    console.log(`   Users remaining: ${remainingUsers}`);

    console.log('\n💡 Recommendations:');
    console.log('   1. Clear your browser cache or hard refresh (Ctrl+F5)');
    console.log('   2. If using React Query, clear the query cache');
    console.log('   3. Consider restarting the backend server');

  } catch (error) {
    console.error('❌ Error during user cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearUsersExceptAdmin()
  .then(() => {
    console.log('\n✨ User cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 User cleanup failed:', error);
    process.exit(1);
  });