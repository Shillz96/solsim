#!/usr/bin/env node

/**
 * Complete Dev User Cleanup Script
 * 
 * Clears ALL data for dev-user-1 and any other potential dev user IDs
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

async function completeDevUserCleanup() {
  console.log('🧹 Starting COMPLETE dev user cleanup...');
  
  try {
    // Start a transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      
      // 1. Delete ALL trades for ANY potential dev user ID
      const allDevUserIds = ['dev-user-1', 'seed-user-1', 'demo-user', 'test-user'];
      
      let totalTrades = 0;
      let totalHoldings = 0;
      
      for (const userId of allDevUserIds) {
        // Delete trades
        const deletedTrades = await tx.trade.deleteMany({
          where: { userId: userId }
        });
        totalTrades += deletedTrades.count;
        
        // Delete holdings
        const deletedHoldings = await tx.holding.deleteMany({
          where: { userId: userId }
        });
        totalHoldings += deletedHoldings.count;
        
        if (deletedTrades.count > 0 || deletedHoldings.count > 0) {
          console.log(`🗑️ Cleaned up ${userId}: ${deletedTrades.count} trades, ${deletedHoldings.count} holdings`);
        }
      }
      
      console.log(`🗑️ Total deleted: ${totalTrades} trades, ${totalHoldings} holdings`);
      
      // 2. Ensure dev-user-1 exists with correct data
      const devUser = await tx.user.upsert({
        where: { id: 'dev-user-1' },
        update: {
          username: 'dev_user',
          email: 'dev@solsim.fun',
          virtualSolBalance: new Decimal('100.00'),
          updatedAt: new Date()
        },
        create: {
          id: 'dev-user-1',
          username: 'dev_user',
          email: 'dev@solsim.fun',
          passwordHash: 'dev-hash',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
          virtualSolBalance: new Decimal('100.00')
        }
      });
      
      console.log(`✅ Dev user ready: ${devUser.username} (${devUser.email}) - Balance: ${devUser.virtualSolBalance} SOL`);
    });
    
    console.log('🎉 Complete cleanup finished!');
    console.log('📊 Final state:');
    console.log('   - User ID: dev-user-1');
    console.log('   - Username: dev_user');
    console.log('   - SOL Balance: 100.00');
    console.log('   - Trades: 0');
    console.log('   - Holdings: 0');
    
  } catch (error) {
    console.error('❌ Error during complete cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the complete cleanup
completeDevUserCleanup()
  .then(() => {
    console.log('🎉 Complete cleanup successful - dev user is completely clean!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Complete cleanup failed:', error);
    process.exit(1);
  });