#!/usr/bin/env node

/**
 * Reset Dev User Script
 * 
 * Resets the dev-user-1 account to initial state:
 * - Clears all trades
 * - Clears all holdings  
 * - Resets SOL balance to 10,000
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

async function resetDevUser() {
  const DEV_USER_ID = 'dev-user-1';
  
  console.log('🔄 Starting dev user reset...');
  
  try {
    // Start a transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // 1. Delete all trades for dev user
      const deletedTrades = await tx.trade.deleteMany({
        where: { userId: DEV_USER_ID }
      });
      console.log(`🗑️ Deleted ${deletedTrades.count} trades`);
      
      // 2. Delete all holdings for dev user
      const deletedHoldings = await tx.holding.deleteMany({
        where: { userId: DEV_USER_ID }
      });
      console.log(`🗑️ Deleted ${deletedHoldings.count} holdings`);
      
      // 3. Reset SOL balance to 100
      const updatedUser = await tx.user.update({
        where: { id: DEV_USER_ID },
        data: {
          virtualSolBalance: new Decimal('100.00'),
          updatedAt: new Date()
        }
      });
      
      console.log(`💰 Reset SOL balance to ${updatedUser.virtualSolBalance}`);
    });
    
    console.log('✅ Dev user reset completed successfully!');
    console.log('📊 Final state:');
    console.log('   - SOL Balance: 100.00');
    console.log('   - Trades: 0');
    console.log('   - Holdings: 0');
    
  } catch (error) {
    console.error('❌ Error resetting dev user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDevUser()
  .then(() => {
    console.log('🎉 Reset complete - dev user is ready for fresh trading!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Reset failed:', error);
    process.exit(1);
  });