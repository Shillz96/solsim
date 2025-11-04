#!/usr/bin/env node
/**
 * Debug script to check user eligibility for rewards
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@metro.proxy.rlwy.net:13936/railway',
    },
  },
});

async function debugUsers() {
  console.log('🔍 Checking user eligibility for rewards...\n');

  try {
    // Get users with trades and wallets
    const usersWithTrades = await prisma.user.findMany({
      where: {
        trades: {
          some: {
            tradeMode: 'PAPER'
          }
        }
      },
      select: {
        id: true,
        handle: true,
        walletAddress: true,
        _count: {
          select: {
            trades: {
              where: { tradeMode: 'PAPER' }
            }
          }
        }
      },
      orderBy: {
        trades: {
          _count: 'desc'
        }
      },
      take: 15
    });

    console.log(`📊 Found ${usersWithTrades.length} users with trades:\n`);

    usersWithTrades.forEach((user, index) => {
      const hasWallet = !!user.walletAddress;
      const tradeCount = user._count.trades;
      const eligible = hasWallet && tradeCount >= 1;
      
      console.log(`${index + 1}. ${user.handle || 'Unknown'}`);
      console.log(`   - Trades: ${tradeCount}`);
      console.log(`   - Wallet: ${hasWallet ? '✅ Connected' : '❌ Missing'}`);
      console.log(`   - Eligible: ${eligible ? '✅ YES' : '❌ NO'}`);
      if (hasWallet) {
        console.log(`   - Address: ${user.walletAddress.substring(0, 8)}...`);
      }
      console.log('');
    });

    const eligibleUsers = usersWithTrades.filter(u => u.walletAddress && u._count.trades >= 1);
    console.log(`\n📈 Summary:`);
    console.log(`   Total users with trades: ${usersWithTrades.length}`);
    console.log(`   Users with wallets: ${usersWithTrades.filter(u => u.walletAddress).length}`);
    console.log(`   Eligible for rewards: ${eligibleUsers.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUsers();