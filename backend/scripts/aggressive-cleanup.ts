/**
 * Aggressive Database Cleanup Script
 *
 * Removes dead/inactive tokens to improve performance:
 * - Graduated tokens older than 7 days
 * - Tokens with zero volume in last 3 days
 * - Tokens that haven't traded in 7+ days
 * - Low-value tokens (< $100 market cap, < 5 watchers)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDatabase() {
  console.log('🧹 Starting Aggressive Database Cleanup...\n');

  try {
    // 1. Count current tokens
    const totalBefore = await prisma.tokenDiscovery.count();
    console.log(`📊 Total tokens before cleanup: ${totalBefore.toLocaleString()}`);

    // 2. Clean up GRADUATED tokens older than 7 days
    console.log('\n🎓 Cleaning graduated tokens older than 7 days...');
    const graduatedCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const graduatedResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        state: 'graduated',
        stateChangedAt: { lt: graduatedCutoff },
      },
    });
    console.log(`   ✅ Deleted ${graduatedResult.count.toLocaleString()} graduated tokens`);

    // 3. Clean up tokens with ZERO volume in last 3 days
    console.log('\n💀 Cleaning tokens with zero volume (last 3 days)...');
    const zeroVolumeResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        OR: [
          { volume24h: { lte: 0 } },
          { volume24h: null },
        ],
        lastTradeTs: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      },
    });
    console.log(`   ✅ Deleted ${zeroVolumeResult.count.toLocaleString()} zero-volume tokens`);

    // 4. Clean up tokens that haven't traded in 7+ days
    console.log('\n⏰ Cleaning tokens inactive for 7+ days...');
    const inactiveCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const inactiveResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        lastTradeTs: { lt: inactiveCutoff },
      },
    });
    console.log(`   ✅ Deleted ${inactiveResult.count.toLocaleString()} inactive tokens`);

    // 5. Clean up low-value tokens (< $100 mcap, < 5 watchers, older than 2 days)
    console.log('\n📉 Cleaning low-value tokens (< $100 mcap, < 5 watchers, 2+ days old)...');
    const lowValueCutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const lowValueResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        marketCapUsd: { lt: 100 },
        watcherCount: { lt: 5 },
        firstSeenAt: { lt: lowValueCutoff },
      },
    });
    console.log(`   ✅ Deleted ${lowValueResult.count.toLocaleString()} low-value tokens`);

    // 6. Clean up NEW tokens older than 24h (more aggressive than default 48h)
    console.log('\n🆕 Cleaning NEW tokens older than 24 hours...');
    const newCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        state: 'new',
        firstSeenAt: { lt: newCutoff },
      },
    });
    console.log(`   ✅ Deleted ${newResult.count.toLocaleString()} old NEW tokens`);

    // 7. Final count
    const totalAfter = await prisma.tokenDiscovery.count();
    const totalRemoved = totalBefore - totalAfter;
    const percentRemoved = ((totalRemoved / totalBefore) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY:');
    console.log('='.repeat(60));
    console.log(`   Before: ${totalBefore.toLocaleString()} tokens`);
    console.log(`   After:  ${totalAfter.toLocaleString()} tokens`);
    console.log(`   Removed: ${totalRemoved.toLocaleString()} tokens (${percentRemoved}%)`);
    console.log('='.repeat(60));

    console.log('\n✨ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
