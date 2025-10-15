#!/usr/bin/env node
/**
 * Seed Test Data Script
 * Creates a test user with SOL balance and sample trades
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data...');

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@virtualsol.fun' },
    update: {
      virtualSolBalance: 100.0, // 100 SOL starting balance
      userTier: 'EMAIL_USER'
    },
    create: {
      email: 'test@virtualsol.fun',
      username: 'testuser',
      passwordHash: await bcrypt.hash('password123', 10),
      displayName: 'Test User',
      virtualSolBalance: 100.0, // 100 SOL starting balance
      userTier: 'EMAIL_USER',
      isProfilePublic: true
    }
  });

  console.log('✅ Created test user:', testUser.email);
  console.log(`💰 SOL Balance: ${testUser.virtualSolBalance} SOL`);

  // Create sample trades
  const sampleTrades = [
    {
      userId: testUser.id,
      tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      tokenSymbol: 'BONK',
      tokenName: 'Bonk',
      action: 'buy',
      side: 'BUY',
      quantity: 1000000,
      price: 0.000025,
      totalCost: 1.0, // 1 SOL
      costUsd: 180.0,
      marketCapUsd: 1500000000
    },
    {
      userId: testUser.id,
      tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      tokenSymbol: 'USDC',
      tokenName: 'USD Coin',
      action: 'buy',
      side: 'BUY',
      quantity: 500,
      price: 1.0,
      totalCost: 2.8, // ~2.8 SOL
      costUsd: 500.0,
      marketCapUsd: 35000000000
    }
  ];

  for (const trade of sampleTrades) {
    const newTrade = await prisma.trade.create({ data: trade });
    console.log(`✅ Created trade: ${trade.side} ${trade.quantity} ${trade.tokenSymbol}`);
  }

  // Create sample positions based on trades
  await prisma.position.create({
    data: {
      userId: testUser.id,
      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      qty: '1000000',
      costBasis: '25.0'
    }
  });

  await prisma.position.create({
    data: {
      userId: testUser.id,
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      qty: '500',
      costBasis: '500.0'
    }
  });

  console.log('✅ Created sample positions');

  // Update user SOL balance after trades (spent 3.8 SOL)
  await prisma.user.update({
    where: { id: testUser.id },
    data: { virtualSolBalance: 96.2 } // 100 - 3.8
  });

  console.log('✅ Updated user SOL balance to 96.2 SOL');
  console.log('🎉 Test data seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });