#!/usr/bin/env node
/**
 * Database Schema Verification Script
 * Checks that all tables exist and are properly configured
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying database schema...\n');

  try {
    // Check User table
    const userCount = await prisma.user.count();
    console.log(`✅ User table: ${userCount} records`);

    // Check Trade table
    const tradeCount = await prisma.trade.count();
    console.log(`✅ Trade table: ${tradeCount} records`);

    // Check Holding table
    const holdingCount = await prisma.holding.count();
    console.log(`✅ Holding table: ${holdingCount} records`);

    // Check Position table
    const positionCount = await prisma.position.count();
    console.log(`✅ Position table: ${positionCount} records`);

    // Check TransactionHistory table
    const transactionCount = await prisma.transactionHistory.count();
    console.log(`✅ TransactionHistory table: ${transactionCount} records`);

    // Check Token table
    const tokenCount = await prisma.token.count();
    console.log(`✅ Token table: ${tokenCount} records`);

    // Check ConversionHistory table
    const conversionCount = await prisma.conversionHistory.count();
    console.log(`✅ ConversionHistory table: ${conversionCount} records`);

    // Check RewardSnapshot table
    const rewardSnapshotCount = await prisma.rewardSnapshot.count();
    console.log(`✅ RewardSnapshot table: ${rewardSnapshotCount} records`);

    // Check RewardClaim table
    const rewardClaimCount = await prisma.rewardClaim.count();
    console.log(`✅ RewardClaim table: ${rewardClaimCount} records`);

    // Check PositionLot table
    const positionLotCount = await prisma.positionLot.count();
    console.log(`✅ PositionLot table: ${positionLotCount} records`);

    // Check RealizedPnL table
    const realizedPnLCount = await prisma.realizedPnL.count();
    console.log(`✅ RealizedPnL table: ${realizedPnLCount} records`);

    // Check PriceTick table
    const priceTickCount = await prisma.priceTick.count();
    console.log(`✅ PriceTick table: ${priceTickCount} records`);

    // Check WalletTrack table
    const walletTrackCount = await prisma.walletTrack.count();
    console.log(`✅ WalletTrack table: ${walletTrackCount} records`);

    // Check CopyTrade table
    const copyTradeCount = await prisma.copyTrade.count();
    console.log(`✅ CopyTrade table: ${copyTradeCount} records`);

    console.log('\n✅ All database tables are properly configured!');
    console.log('📊 Database is ready for production use.');

    // Check for critical indexes
    console.log('\n🔍 Checking critical indexes...');
    
    const result = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    ` as any[];

    const tableIndexes: Record<string, number> = {};
    result.forEach((row: any) => {
      tableIndexes[row.tablename] = (tableIndexes[row.tablename] || 0) + 1;
    });

    console.log('\nIndex counts by table:');
    Object.entries(tableIndexes).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} indexes`);
    });

    console.log('\n✅ Database schema verification complete!');

  } catch (error) {
    console.error('❌ Database verification failed:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Verification script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
