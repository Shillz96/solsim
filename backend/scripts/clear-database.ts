#!/usr/bin/env node
/**
 * Clear Database Script
 * DANGER: This will delete ALL data from the database
 * Use with caution - primarily for clearing test/mock data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  WARNING: This will delete ALL data from the database!');
  console.log('🗑️  Starting database cleanup...');

  // Delete all data in the correct order to respect foreign key constraints
  console.log('Deleting reward claims...');
  await prisma.rewardClaim.deleteMany({});

  console.log('Deleting copy trades...');
  await prisma.copyTrade.deleteMany({});

  console.log('Deleting wallet tracks...');
  await prisma.walletTrack.deleteMany({});

  console.log('Deleting realized PnLs...');
  await prisma.realizedPnL.deleteMany({});

  console.log('Deleting positions...');
  await prisma.position.deleteMany({});

  console.log('Deleting conversion history...');
  await prisma.conversionHistory.deleteMany({});

  console.log('Deleting transaction history...');
  await prisma.transactionHistory.deleteMany({});

  console.log('Deleting holdings...');
  await prisma.holding.deleteMany({});

  console.log('Deleting trades...');
  await prisma.trade.deleteMany({});

  console.log('Deleting users...');
  await prisma.user.deleteMany({});

  console.log('✅ Database cleared successfully!');
  console.log('📊 All tables are now empty.');
}

main()
  .catch((e) => {
    console.error('❌ Database cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
