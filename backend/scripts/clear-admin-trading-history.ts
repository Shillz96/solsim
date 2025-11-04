/**
 * Clear Admin User Trading History and P&L Script
 *
 * This script clears all trading-related data for admin@admin.com while keeping
 * the user account intact. This includes trades, positions, P&L, and resets balances.
 *
 * Run with: npx tsx backend/scripts/clear-admin-trading-history.ts
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

async function clearAdminTradingHistory() {
  console.log('🔍 Clearing admin@admin.com trading history and P&L...\n');

  try {
    // First, find the admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' },
      select: { 
        id: true, 
        email: true, 
        handle: true,
        virtualSolBalance: true,
        realSolBalance: true,
        rewardPoints: true
      }
    });

    if (!adminUser) {
      console.error('❌ Admin user (admin@admin.com) not found in database!');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.email} (${adminUser.handle})`);
    console.log(`   Current virtual SOL balance: ${adminUser.virtualSolBalance}`);
    console.log(`   Current real SOL balance: ${adminUser.realSolBalance}`);
    console.log(`   Current reward points: ${adminUser.rewardPoints}`);

    // Get counts of trading data before deletion
    const counts = {
      trades: await prisma.trade.count({ where: { userId: adminUser.id } }),
      positions: await prisma.position.count({ where: { userId: adminUser.id } }),
      realizedPnls: await prisma.realizedPnL.count({ where: { userId: adminUser.id } }),
      perpPositions: await prisma.perpPosition.count({ where: { userId: adminUser.id } }),
      perpTrades: await prisma.perpTrade.count({ where: { userId: adminUser.id } }),
      liquidations: await prisma.liquidation.count({ where: { userId: adminUser.id } }),
      transactions: await prisma.transactionHistory.count({ where: { userId: adminUser.id } }),
      conversions: await prisma.conversionHistory.count({ where: { userId: adminUser.id } }),
      solPurchases: await prisma.solPurchase.count({ where: { userId: adminUser.id } }),
      deposits: await prisma.deposit.count({ where: { userId: adminUser.id } }),
      withdrawals: await prisma.withdrawal.count({ where: { userId: adminUser.id } })
    };

    console.log('\n📊 Current trading data counts:');
    Object.entries(counts).forEach(([key, count]) => {
      if (count > 0) {
        console.log(`   ${key}: ${count}`);
      }
    });

    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);

    if (totalRecords === 0) {
      console.log('\nℹ️  No trading data found for admin user. Nothing to clear.');
      return;
    }

    console.log(`\n🗑️  Total records to delete: ${totalRecords}`);
    console.log('\n🗑️  Starting deletion process...');

    // Delete trading-related data for admin user
    console.log('   Deleting trades...');
    const deletedTrades = await prisma.trade.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting positions...');
    const deletedPositions = await prisma.position.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting realized P&L records...');
    const deletedRealizedPnls = await prisma.realizedPnL.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting perpetual positions...');
    const deletedPerpPositions = await prisma.perpPosition.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting perpetual trades...');
    const deletedPerpTrades = await prisma.perpTrade.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting liquidations...');
    const deletedLiquidations = await prisma.liquidation.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting transaction history...');
    const deletedTransactions = await prisma.transactionHistory.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting conversion history...');
    const deletedConversions = await prisma.conversionHistory.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting SOL purchases...');
    const deletedSolPurchases = await prisma.solPurchase.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting deposits...');
    const deletedDeposits = await prisma.deposit.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Deleting withdrawals...');
    const deletedWithdrawals = await prisma.withdrawal.deleteMany({
      where: { userId: adminUser.id }
    });

    console.log('   Resetting user balances and counters...');

    // Reset user balances and trading-related fields
    const updatedUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        virtualSolBalance: 100, // Reset to default starting balance
        realSolBalance: 0,
        rewardPoints: 0,
        monthlyConversions: 0,
        conversionResetAt: null,
        lastClaimTime: null,
        vsolTokenBalance: null,
        vsolBalanceUpdated: null,
        // Keep other fields like email, handle, profile data intact
      },
      select: {
        virtualSolBalance: true,
        realSolBalance: true,
        rewardPoints: true
      }
    });

    console.log('\n✅ All trading data deleted and balances reset successfully');

    console.log('\n📊 Deletion summary:');
    console.log(`   Trades: ${deletedTrades.count}`);
    console.log(`   Positions: ${deletedPositions.count}`);
    console.log(`   Realized P&Ls: ${deletedRealizedPnls.count}`);
    console.log(`   Perp positions: ${deletedPerpPositions.count}`);
    console.log(`   Perp trades: ${deletedPerpTrades.count}`);
    console.log(`   Liquidations: ${deletedLiquidations.count}`);
    console.log(`   Transactions: ${deletedTransactions.count}`);
    console.log(`   Conversions: ${deletedConversions.count}`);
    console.log(`   SOL purchases: ${deletedSolPurchases.count}`);
    console.log(`   Deposits: ${deletedDeposits.count}`);
    console.log(`   Withdrawals: ${deletedWithdrawals.count}`);

    const totalDeleted = [
      deletedTrades.count,
      deletedPositions.count,
      deletedRealizedPnls.count,
      deletedPerpPositions.count,
      deletedPerpTrades.count,
      deletedLiquidations.count,
      deletedTransactions.count,
      deletedConversions.count,
      deletedSolPurchases.count,
      deletedDeposits.count,
      deletedWithdrawals.count,
      deletedRewardPayouts.count
    ].reduce((sum, count) => sum + count, 0);

    console.log(`   Total records deleted: ${totalDeleted}`);

    console.log('\n📈 Updated balances:');
    console.log(`   Virtual SOL balance: ${updatedUser.virtualSolBalance}`);
    console.log(`   Real SOL balance: ${updatedUser.realSolBalance}`);
    console.log(`   Reward points: ${updatedUser.rewardPoints}`);

    console.log('\n💡 Recommendations:');
    console.log('   1. Clear your browser cache or hard refresh (Ctrl+F5)');
    console.log('   2. If using React Query, clear the query cache');
    console.log('   3. Admin user now has a fresh start with 100 virtual SOL');

  } catch (error) {
    console.error('❌ Error during admin trading history cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearAdminTradingHistory()
  .then(() => {
    console.log('\n✨ Admin trading history cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Admin trading history cleanup failed:', error);
    process.exit(1);
  });