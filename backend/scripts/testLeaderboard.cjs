#!/usr/bin/env node
/**
 * Debug script to test leaderboard service
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@metro.proxy.rlwy.net:13936/railway',
    },
  },
});

async function testLeaderboard() {
  console.log('🔍 Testing leaderboard service...\n');

  try {
    // Import the leaderboard service
    const { getLeaderboard } = await import("../src/services/leaderboardService.js");

    // Get top 10 from the leaderboard
    console.log('📊 Calling getLeaderboard(10)...');
    const leaderboard = await getLeaderboard(10);

    console.log(`📈 Leaderboard returned ${leaderboard.length} entries:\n`);

    if (leaderboard.length === 0) {
      console.log('❌ Leaderboard is empty!');
      return;
    }

    leaderboard.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.handle || 'Unknown'} (Rank ${entry.rank})`);
      console.log(`   - User ID: ${entry.userId}`);
      console.log(`   - Total PnL: $${entry.totalPnlUsd}`);
      console.log(`   - Total Trades: ${entry.totalTrades}`);
      console.log(`   - Win Rate: ${entry.winRate}%`);
      console.log(`   - Volume: $${entry.totalVolumeUsd}`);
      console.log('');
    });

    // Now check wallet addresses for these users
    console.log('🔍 Checking wallet addresses for leaderboard users...\n');

    for (const entry of leaderboard) {
      const user = await prisma.user.findUnique({
        where: { id: entry.userId },
        select: {
          handle: true,
          walletAddress: true
        }
      });

      const hasWallet = !!user?.walletAddress;
      const eligible = hasWallet && entry.totalTrades >= 1;

      console.log(`${entry.handle || 'Unknown'}: ${eligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
      console.log(`   - Wallet: ${hasWallet ? '✅ Connected' : '❌ Missing'}`);
      console.log(`   - Trades: ${entry.totalTrades} (need ≥1)`);
      if (hasWallet) {
        console.log(`   - Address: ${user.walletAddress.substring(0, 8)}...`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLeaderboard();