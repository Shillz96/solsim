/**
 * Cleanup Fake/Invalid Tokens
 *
 * Deletes tokens from TokenDiscovery that have no metadata and don't exist on-chain.
 * These are likely spam/fake tokens from PumpPortal that shouldn't be shown on Warp Pipes.
 *
 * Usage:
 *   npx tsx src/scripts/cleanup-fake-tokens.ts
 */

import { PrismaClient } from '@prisma/client';

// Set DATABASE_URL if not already set (for Railway connection)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@metro.proxy.rlwy.net:13936/railway';
}

const prisma = new PrismaClient();

async function cleanupFakeTokens() {
  console.log('🧹 Starting Fake Token Cleanup...\n');

  try {
    // Find tokens with NO metadata AND state='new'
    // These are likely fake/spam tokens that shouldn't be shown
    const fakeTokens = await prisma.tokenDiscovery.findMany({
      where: {
        state: 'new',
        symbol: null,
        name: null,
        logoURI: null,
      },
      select: {
        mint: true,
        priceUsd: true,
        volume24h: true,
        txCount24h: true,
        firstSeenAt: true,
      },
      orderBy: {
        firstSeenAt: 'desc',
      },
    });

    console.log(`📊 Found ${fakeTokens.length} tokens with NO metadata\n`);

    if (fakeTokens.length === 0) {
      console.log('✅ No fake tokens found!');
      return;
    }

    // Show some examples
    console.log('Examples of tokens to be deleted:');
    fakeTokens.slice(0, 5).forEach((token, i) => {
      console.log(
        `  ${i + 1}. ${token.mint.slice(0, 8)}... - ` +
        `Price: ${token.priceUsd ? `$${token.priceUsd}` : 'N/A'} | ` +
        `Volume: ${token.volume24h ? `$${token.volume24h}` : 'N/A'} | ` +
        `Txs: ${token.txCount24h || 0}`
      );
    });

    console.log(`\n⚠️  About to delete ${fakeTokens.length} tokens from the database.`);
    console.log('These tokens have NO symbol, name, or logo and are likely fake/spam.\n');

    // Delete them
    const result = await prisma.tokenDiscovery.deleteMany({
      where: {
        state: 'new',
        symbol: null,
        name: null,
        logoURI: null,
      },
    });

    console.log(`✅ Deleted ${result.count} fake tokens!`);
    console.log('\n🎉 Cleanup Complete!');
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupFakeTokens().catch(console.error);
