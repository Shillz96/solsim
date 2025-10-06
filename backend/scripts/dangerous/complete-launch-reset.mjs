#!/usr/bin/env node

/**
 * COMPLETE LAUNCH RESET SCRIPT
 * 
 * This script completely resets the platform for a clean launch:
 * - Deletes ALL trades and holdings
 * - Resets ALL user balances to 100 SOL
 * - Clears token metadata cache
 * - Resets user stats (total trades, win rate, etc.)
 * 
 * WARNING: This will delete ALL trading data!
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library.js';

const prisma = new PrismaClient();

async function completeReset() {
  console.log('🚨 COMPLETE PLATFORM RESET - This will delete ALL trading data!');
  console.log('Starting in 3 seconds...');
  
  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    console.log('\n📊 Current database state:');
    
    // Show current stats
    const userCount = await prisma.user.count();
    const tradeCount = await prisma.trade.count();
    const holdingCount = await prisma.holding.count();
    const metadataCount = await prisma.tokenMetadata.count();
    
    console.log(`- Users: ${userCount}`);
    console.log(`- Trades: ${tradeCount}`);
    console.log(`- Holdings: ${holdingCount}`);
    console.log(`- Token Metadata: ${metadataCount}`);
    
    // Sample user balances
    const sampleUsers = await prisma.user.findMany({
      select: { username: true, virtualSolBalance: true },
      take: 5
    });
    
    console.log('\nSample user balances:');
    sampleUsers.forEach(user => {
      console.log(`- ${user.username}: ${user.virtualSolBalance} SOL`);
    });
    
    console.log('\n🗑️ STEP 1: Deleting all trades...');
    const deletedTrades = await prisma.trade.deleteMany({});
    console.log(`✅ Deleted ${deletedTrades.count} trades`);
    
    console.log('\n🗑️ STEP 2: Deleting all holdings...');
    const deletedHoldings = await prisma.holding.deleteMany({});
    console.log(`✅ Deleted ${deletedHoldings.count} holdings`);
    
    console.log('\n🗑️ STEP 3: Clearing token metadata cache...');
    const deletedMetadata = await prisma.tokenMetadata.deleteMany({});
    console.log(`✅ Deleted ${deletedMetadata.count} token metadata entries`);
    
    console.log('\n💰 STEP 4: Resetting all user balances to 100 SOL...');
    const resetUsers = await prisma.user.updateMany({
      data: {
        virtualSolBalance: new Decimal('100.0')
      }
    });
    console.log(`✅ Reset ${resetUsers.count} user balances to 100 SOL`);
    
    console.log('\n📊 STEP 5: Final verification...');
    
    // Verify reset
    const finalStats = {
      users: await prisma.user.count(),
      trades: await prisma.trade.count(),
      holdings: await prisma.holding.count(),
      metadata: await prisma.tokenMetadata.count()
    };
    
    const balanceCheck = await prisma.user.findMany({
      select: { username: true, virtualSolBalance: true },
      take: 5
    });
    
    console.log('\n✅ RESET COMPLETE!');
    console.log('\nFinal state:');
    console.log(`- Users: ${finalStats.users} (preserved)`);
    console.log(`- Trades: ${finalStats.trades} (should be 0)`);
    console.log(`- Holdings: ${finalStats.holdings} (should be 0)`);
    console.log(`- Token Metadata: ${finalStats.metadata} (should be 0)`);
    
    console.log('\nUser balances after reset:');
    balanceCheck.forEach(user => {
      console.log(`- ${user.username}: ${user.virtualSolBalance} SOL`);
    });
    
    if (finalStats.trades === 0 && finalStats.holdings === 0) {
      console.log('\n🎉 SUCCESS! Platform is ready for clean launch');
      console.log('\nNext steps:');
      console.log('1. Deploy latest backend code');
      console.log('2. Deploy latest frontend code');
      console.log('3. Test with fresh trades');
      console.log('4. Verify PnL calculations are correct');
    } else {
      console.log('\n⚠️ WARNING: Some data may not have been cleared properly');
    }
    
  } catch (error) {
    console.error('❌ Error during reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
completeReset()
  .then(() => {
    console.log('\n🚀 Database reset completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Reset failed:', error);
    process.exit(1);
  });