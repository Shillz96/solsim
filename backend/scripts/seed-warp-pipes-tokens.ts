/**
 * Seed Warp Pipes Test Tokens
 * 
 * Adds sample tokens to TokenDiscovery table for testing the Warp Pipes UI
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const TEST_TOKENS = [
  // Bonded tokens (on bonding curve)
  {
    mint: 'BondedTest1111111111111111111111111111111',
    symbol: 'MARIO',
    name: 'Super Mario Coin',
    logoURI: 'https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg',
    state: 'bonded',
    bondingCurveProgress: new Decimal(45.5),
    hotScore: new Decimal(92),
    watcherCount: 5,
    freezeRevoked: false,
    mintRenounced: false,
    creatorVerified: false,
  },
  {
    mint: 'BondedTest2222222222222222222222222222222',
    symbol: 'LUIGI',
    name: 'Luigi Green Token',
    logoURI: 'https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg',
    state: 'bonded',
    bondingCurveProgress: new Decimal(67.8),
    hotScore: new Decimal(85),
    watcherCount: 3,
    freezeRevoked: true,
    mintRenounced: false,
    creatorVerified: false,
  },
  {
    mint: 'BondedTest3333333333333333333333333333333',
    symbol: 'PEACH',
    name: 'Princess Peach',
    logoURI: 'https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg',
    state: 'bonded',
    bondingCurveProgress: new Decimal(23.4),
    hotScore: new Decimal(78),
    watcherCount: 2,
    freezeRevoked: false,
    mintRenounced: false,
    creatorVerified: true,
  },

  // Graduating tokens (migration in progress)
  {
    mint: 'GraduatingTest1111111111111111111111111111',
    symbol: 'YOSHI',
    name: 'Yoshi Egg Token',
    logoURI: 'https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg',
    state: 'graduating',
    bondingCurveProgress: new Decimal(100),
    hotScore: new Decimal(95),
    watcherCount: 8,
    freezeRevoked: true,
    mintRenounced: true,
    creatorVerified: false,
  },
  {
    mint: 'GraduatingTest2222222222222222222222222222',
    symbol: 'TOAD',
    name: 'Toad Mushroom',
    logoURI: 'https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg',
    state: 'graduating',
    bondingCurveProgress: new Decimal(100),
    hotScore: new Decimal(88),
    watcherCount: 6,
    freezeRevoked: true,
    mintRenounced: false,
    creatorVerified: true,
  },

  // New tokens (graduated to AMM)
  {
    mint: 'NewPoolTest1111111111111111111111111111111',
    symbol: 'BOWSER',
    name: 'Bowser King',
    logoURI: 'https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg',
    state: 'new',
    liquidityUsd: new Decimal(15000),
    poolType: 'raydium_clmm',
    poolAddress: 'PoolAddr11111111111111111111111111111111',
    poolCreatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    priceImpact1Pct: new Decimal(0.5),
    hotScore: new Decimal(100),
    watcherCount: 12,
    freezeRevoked: true,
    mintRenounced: true,
    creatorVerified: false,
  },
  {
    mint: 'NewPoolTest2222222222222222222222222222222',
    symbol: 'STAR',
    name: 'Power Star Token',
    logoURI: 'https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg',
    state: 'new',
    liquidityUsd: new Decimal(50000),
    poolType: 'raydium_v4',
    poolAddress: 'PoolAddr22222222222222222222222222222222',
    poolCreatedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    priceImpact1Pct: new Decimal(0.2),
    hotScore: new Decimal(97),
    watcherCount: 20,
    freezeRevoked: true,
    mintRenounced: true,
    creatorVerified: true,
  },
  {
    mint: 'NewPoolTest3333333333333333333333333333333',
    symbol: 'COIN',
    name: 'Gold Coin',
    logoURI: 'https://pbs.twimg.com/profile_images/1590968738358079488/IY9Gx6Ok_400x400.jpg',
    state: 'new',
    liquidityUsd: new Decimal(8500),
    poolType: 'raydium_clmm',
    poolAddress: 'PoolAddr33333333333333333333333333333333',
    poolCreatedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    priceImpact1Pct: new Decimal(1.2),
    hotScore: new Decimal(82),
    watcherCount: 7,
    freezeRevoked: false,
    mintRenounced: true,
    creatorVerified: false,
  },
];

async function seedTokens() {
  console.log('🌱 Seeding Warp Pipes test tokens...');

  try {
    // Check if test tokens already exist
    const existing = await prisma.tokenDiscovery.count({
      where: {
        mint: { in: TEST_TOKENS.map(t => t.mint) }
      }
    });

    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing test tokens. Deleting them first...`);
      await prisma.tokenDiscovery.deleteMany({
        where: {
          mint: { in: TEST_TOKENS.map(t => t.mint) }
        }
      });
    }

    // Insert test tokens
    for (const token of TEST_TOKENS) {
      await prisma.tokenDiscovery.create({
        data: {
          ...token,
          firstSeenAt: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
          lastUpdatedAt: new Date(),
          stateChangedAt: new Date(),
        }
      });
      console.log(`✅ Created ${token.state.toUpperCase()} token: ${token.symbol}`);
    }

    console.log('\n🎉 Successfully seeded test tokens!');
    console.log('\nToken counts by state:');
    
    const counts = await prisma.tokenDiscovery.groupBy({
      by: ['state'],
      _count: true,
      where: {
        mint: { in: TEST_TOKENS.map(t => t.mint) }
      }
    });

    counts.forEach(({ state, _count }) => {
      console.log(`  ${state}: ${_count}`);
    });

    console.log('\n✨ Refresh your Warp Pipes feed page to see the tokens!');
  } catch (error) {
    console.error('❌ Error seeding tokens:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedTokens();

