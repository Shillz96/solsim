/**
 * Database Cleanup Script: Remove Invalid Mint Addresses
 *
 * Finds and deletes TokenDiscovery records with invalid mint addresses
 * (e.g., addresses with "pump" suffix or wrong length)
 *
 * Run with: npx tsx backend/scripts/cleanup-invalid-mints.ts
 */

import { PrismaClient } from '@prisma/client';

// Railway PostgreSQL connection
const DATABASE_URL = 'postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@metro.proxy.rlwy.net:13936/railway';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

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
        imageUrl: true,
        firstSeenAt: true,
      },
    });

    console.log(`📊 Total tokens in database: ${allTokens.length}`);

    // Show some sample data first
    console.log('\n🔍 Sample mint addresses:');
    allTokens.slice(0, 10).forEach((token, index) => {
      console.log(`${index + 1}. ${token.mint} (${token.mint.length} chars) - ${token.symbol || 'NO_SYMBOL'}`);
    });

    // Look for specific problematic patterns
    const pumpSuffixTokens = allTokens.filter(token => token.mint.toLowerCase().endsWith('pump'));
    const shortMints = allTokens.filter(token => token.mint.length < 32);
    const longMints = allTokens.filter(token => token.mint.length > 44);
    const nonBase58Tokens = allTokens.filter(token => !/^[1-9A-HJ-NP-Za-km-z]+$/.test(token.mint));
    const missingImageTokens = allTokens.filter(token => !token.imageUrl || token.imageUrl.trim() === '');

    console.log('\n📊 Problematic patterns found:');
    console.log(`   Tokens ending with "pump": ${pumpSuffixTokens.length}`);
    console.log(`   Tokens too short (<32 chars): ${shortMints.length}`);
    console.log(`   Tokens too long (>44 chars): ${longMints.length}`);
    console.log(`   Tokens with non-base58 chars: ${nonBase58Tokens.length}`);
    console.log(`   Tokens with missing images: ${missingImageTokens.length}`);

    // Combine all invalid tokens
    const invalidTokens = [
      ...pumpSuffixTokens,
      ...shortMints,
      ...longMints,
      ...nonBase58Tokens
    ].filter((token, index, self) => self.findIndex(t => t.id === token.id) === index); // Remove duplicates

    if (invalidTokens.length === 0) {
      console.log('\n✅ No invalid mint addresses found based on format rules.');
      
      if (missingImageTokens.length > 0) {
        console.log(`\n⚠️  However, found ${missingImageTokens.length} tokens with missing images:`);
        missingImageTokens.slice(0, 10).forEach((token, index) => {
          console.log(`${index + 1}. ${token.mint} - ${token.symbol || 'N/A'} (No image URL)`);
        });
      }
      
      return;
    }

    console.log(`\n⚠️  Found ${invalidTokens.length} tokens with invalid mint addresses:\n`);

    // Display invalid tokens by category
    if (pumpSuffixTokens.length > 0) {
      console.log(`🎯 Tokens ending with "pump" (${pumpSuffixTokens.length}):`);
      pumpSuffixTokens.slice(0, 5).forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.mint} - ${token.symbol || 'N/A'}`);
      });
      if (pumpSuffixTokens.length > 5) console.log(`   ... and ${pumpSuffixTokens.length - 5} more`);
      console.log('');
    }

    if (shortMints.length > 0) {
      console.log(`📏 Tokens too short (${shortMints.length}):`);
      shortMints.slice(0, 5).forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.mint} (${token.mint.length} chars) - ${token.symbol || 'N/A'}`);
      });
      if (shortMints.length > 5) console.log(`   ... and ${shortMints.length - 5} more`);
      console.log('');
    }

    if (longMints.length > 0) {
      console.log(`📏 Tokens too long (${longMints.length}):`);
      longMints.slice(0, 5).forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.mint} (${token.mint.length} chars) - ${token.symbol || 'N/A'}`);
      });
      if (longMints.length > 5) console.log(`   ... and ${longMints.length - 5} more`);
      console.log('');
    }

    if (nonBase58Tokens.length > 0) {
      console.log(`🔤 Tokens with invalid characters (${nonBase58Tokens.length}):`);
      nonBase58Tokens.slice(0, 5).forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.mint} - ${token.symbol || 'N/A'}`);
      });
      if (nonBase58Tokens.length > 5) console.log(`   ... and ${nonBase58Tokens.length - 5} more`);
      console.log('');
    }

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

    // Track tokens deleted for missing images
    let tokensDeletedForMissingImages = 0;

    // Also handle tokens with missing images
    if (missingImageTokens.length > 0) {
      console.log(`\n🖼️  Handling ${missingImageTokens.length} tokens with missing images...`);
      
      // Delete tokens with missing images that are older than 1 hour
      // (give new tokens some time to get their metadata)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const tokensToDeleteForMissingImages = missingImageTokens.filter(token => 
        token.firstSeenAt && token.firstSeenAt < oneHourAgo
      );

      if (tokensToDeleteForMissingImages.length > 0) {
        const deleteImagelessResult = await prisma.tokenDiscovery.deleteMany({
          where: {
            id: {
              in: tokensToDeleteForMissingImages.map(t => t.id),
            },
          },
        });

        tokensDeletedForMissingImages = deleteImagelessResult.count;
        console.log(`✅ Deleted ${deleteImagelessResult.count} old tokens with missing images`);
      } else {
        console.log('ℹ️  All tokens with missing images are new (< 1 hour), keeping them for now');
      }
    }
    
    console.log('\n📈 Summary:');
    console.log(`   Total tokens before: ${allTokens.length}`);
    console.log(`   Invalid tokens removed: ${deleteResult.count}`);
    console.log(`   Imageless tokens removed: ${tokensDeletedForMissingImages}`);
    console.log(`   Total tokens after: ${allTokens.length - deleteResult.count - tokensDeletedForMissingImages}`);

    // Recommend frontend cache clearing
    console.log('\n💡 Recommendations:');
    console.log('   1. Clear your browser cache or hard refresh (Ctrl+F5)');
    console.log('   2. If using React Query, clear the query cache');
    console.log('   3. Consider running this script regularly to catch new invalid tokens');

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
