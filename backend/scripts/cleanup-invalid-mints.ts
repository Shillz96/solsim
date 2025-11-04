/**
 * Database Cleanup Script: Remove Invalid Mint Addresses
 *
 * Finds and deletes TokenDiscovery records with invalid mint addresses
 * (e.g., addresses with "pump" suffix or wrong length)
 *
 * Run with: npx tsx backend/scripts/cleanup-invalid-mints.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupInvalidMints() {
  console.log('🔍 Scanning TokenDiscovery table for invalid mint addresses...\n');

  try {
    // Fetch ALL tokens to check them in-memory
    // (Prisma doesn't support regex directly in WHERE clause)
    const allTokens = await prisma.tokenDiscovery.findMany({
      select: {
        id: true,
        mint: true,
        symbol: true,
        name: true,
        firstSeenAt: true,
      },
    });

    console.log(`📊 Total tokens in database: ${allTokens.length}`);

    // Validate mint format: 32-44 characters, base58 encoded
    const VALID_MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const invalidTokens = allTokens.filter(token => !VALID_MINT_REGEX.test(token.mint));

    if (invalidTokens.length === 0) {
      console.log('✅ No invalid mint addresses found. Database is clean!');
      return;
    }

    console.log(`\n⚠️  Found ${invalidTokens.length} tokens with invalid mint addresses:\n`);

    // Display invalid tokens
    invalidTokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.mint} (${token.mint.length} chars)`);
      console.log(`   Symbol: ${token.symbol || 'N/A'}`);
      console.log(`   Name: ${token.name || 'N/A'}`);
      console.log(`   First Seen: ${token.firstSeenAt?.toISOString() || 'N/A'}`);
      console.log('');
    });

    // Ask for confirmation (in production, you might want to skip this)
    console.log('🗑️  Deleting invalid tokens...\n');

    // Delete invalid tokens
    const deleteResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        id: {
          in: invalidTokens.map(t => t.id),
        },
      },
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} invalid tokens`);
    console.log('\n📈 Summary:');
    console.log(`   Total tokens before: ${allTokens.length}`);
    console.log(`   Invalid tokens removed: ${deleteResult.count}`);
    console.log(`   Total tokens after: ${allTokens.length - deleteResult.count}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupInvalidMints()
  .then(() => {
    console.log('\n✨ Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });
