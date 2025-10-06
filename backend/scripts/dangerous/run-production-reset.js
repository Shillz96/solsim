/**
 * Production database reset using Prisma
 */

const { PrismaClient } = require('@prisma/client');

async function runReset() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚨 PRODUCTION DATABASE RESET');
    console.log('🔗 Connected to database');
    
    // Show current state
    console.log('\n📊 CURRENT STATE:');
    const userCount = await prisma.user.count();
    const tradeCount = await prisma.trade.count();
    const holdingCount = await prisma.holding.count();
    const metadataCount = await prisma.tokenMetadata.count();
    
    console.log(`- Users: ${userCount}`);
    console.log(`- Trades: ${tradeCount}`);
    console.log(`- Holdings: ${holdingCount}`);
    console.log(`- Token Metadata: ${metadataCount}`);
    
    // Sample balances before reset
    console.log('\n💰 SAMPLE BALANCES BEFORE RESET:');
    const sampleUsers = await prisma.user.findMany({
      select: { username: true, virtualSolBalance: true },
      orderBy: { virtualSolBalance: 'desc' },
      take: 5
    });
    
    sampleUsers.forEach(user => {
      console.log(`- ${user.username}: ${user.virtualSolBalance} SOL`);
    });
    
    // STEP 1: Delete all trades
    console.log('\n🗑️ STEP 1: Deleting all trades...');
    const deletedTrades = await prisma.trade.deleteMany({});
    console.log(`✅ Deleted ${deletedTrades.count} trades`);
    
    // STEP 2: Delete all holdings
    console.log('\n🗑️ STEP 2: Deleting all holdings...');
    const deletedHoldings = await prisma.holding.deleteMany({});
    console.log(`✅ Deleted ${deletedHoldings.count} holdings`);
    
    // STEP 3: Clear token metadata cache
    console.log('\n�️ STEP 3: Clearing token metadata cache...');
    const deletedMetadata = await prisma.tokenMetadata.deleteMany({});
    console.log(`✅ Deleted ${deletedMetadata.count} token metadata entries`);
    
    // STEP 4: Reset all user balances to 100 SOL
    console.log('\n� STEP 4: Resetting all user balances to 100 SOL...');
    const resetUsers = await prisma.user.updateMany({
      data: {
        virtualSolBalance: 100.0
      }
    });
    console.log(`✅ Reset ${resetUsers.count} user balances to 100 SOL`);
    
    // Verify final state
    console.log('\n📊 FINAL STATE:');
    const finalUserCount = await prisma.user.count();
    const finalTradeCount = await prisma.trade.count();
    const finalHoldingCount = await prisma.holding.count();
    const finalMetadataCount = await prisma.tokenMetadata.count();
    
    console.log(`- Users: ${finalUserCount} (preserved)`);
    console.log(`- Trades: ${finalTradeCount} (should be 0)`);
    console.log(`- Holdings: ${finalHoldingCount} (should be 0)`);
    console.log(`- Token Metadata: ${finalMetadataCount} (should be 0)`);
    
    // Sample balances after reset
    console.log('\n💰 SAMPLE BALANCES AFTER RESET:');
    const balanceCheck = await prisma.user.findMany({
      select: { username: true, virtualSolBalance: true },
      orderBy: { virtualSolBalance: 'desc' },
      take: 5
    });
    
    balanceCheck.forEach(user => {
      console.log(`- ${user.username}: ${user.virtualSolBalance} SOL`);
    });
    
    if (finalTradeCount === 0 && finalHoldingCount === 0) {
      console.log('\n🎉 SUCCESS! Platform is ready for clean launch');
      console.log('\nNext steps:');
      console.log('1. Latest backend/frontend code is already deployed');
      console.log('2. Test with fresh trades to verify PnL calculations');
      console.log('3. Verify Portfolio page shows correct values');
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

runReset()
  .then(() => {
    console.log('\n🚀 Database reset completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Reset failed:', err);
    process.exit(1);
  });