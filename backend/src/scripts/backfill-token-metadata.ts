/**
 * Backfill Token Metadata Script
 *
 * Updates existing TokenDiscovery records with missing market data.
 * Fetches from DexScreener with rate limiting to avoid hitting limits.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-token-metadata.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { tokenMetadataService } from '../services/tokenMetadataService.js';

const prisma = new PrismaClient();

// Configuration
const BATCH_SIZE = 50; // Process 50 tokens at a time
const DELAY_BETWEEN_REQUESTS = 1500; // 1.5 seconds between requests to avoid rate limiting
const MAX_TOKENS = 500; // Limit total tokens to process (adjust as needed)

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Backfill metadata for tokens missing market data
 */
async function backfillMetadata() {
  console.log('🔄 Starting Token Metadata Backfill...\n');

  try {
    // Find tokens missing market data
    const tokensToUpdate = await prisma.tokenDiscovery.findMany({
      where: {
        OR: [
          { marketCapUsd: null },
          { volume24h: null },
        ],
      },
      orderBy: {
        firstSeenAt: 'desc', // Start with newest tokens
      },
      take: MAX_TOKENS,
    });

    console.log(`📊 Found ${tokensToUpdate.length} tokens needing metadata\n`);

    if (tokensToUpdate.length === 0) {
      console.log('✅ All tokens already have metadata!');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < tokensToUpdate.length; i++) {
      const token = tokensToUpdate[i];
      const progress = `[${i + 1}/${tokensToUpdate.length}]`;

      try {
        console.log(`${progress} Fetching data for ${token.symbol || token.mint.slice(0, 8)}...`);

        // Fetch enriched metadata from DexScreener
        const enrichedData = await tokenMetadataService.getEnrichedMetadata(
          token.mint,
          token.logoURI || undefined
        );

        // Check if we got any useful data
        const hasMarketData = !!(
          enrichedData.marketCapUsd ||
          enrichedData.volume24h ||
          enrichedData.priceUsd
        );

        if (!hasMarketData) {
          console.log(`${progress} ⚠️  No market data available for ${token.symbol || token.mint.slice(0, 8)}`);
          skippedCount++;

          // Still add a small delay to avoid rate limiting
          await sleep(500);
          continue;
        }

        // Prepare update data
        const updateData: any = {
          lastUpdatedAt: new Date(),
        };

        // Add metadata if available
        if (enrichedData.description) updateData.description = enrichedData.description;
        if (enrichedData.imageUrl) updateData.imageUrl = enrichedData.imageUrl;
        if (enrichedData.twitter) updateData.twitter = enrichedData.twitter;
        if (enrichedData.telegram) updateData.telegram = enrichedData.telegram;
        if (enrichedData.website) updateData.website = enrichedData.website;

        // Add market data
        if (enrichedData.marketCapUsd) {
          updateData.marketCapUsd = new Decimal(enrichedData.marketCapUsd);
        }
        if (enrichedData.volume24h) {
          updateData.volume24h = new Decimal(enrichedData.volume24h);
        }
        if (enrichedData.volumeChange24h) {
          updateData.volumeChange24h = new Decimal(enrichedData.volumeChange24h);
        }
        if (enrichedData.priceUsd) {
          updateData.priceUsd = new Decimal(enrichedData.priceUsd);
        }
        if (enrichedData.priceChange24h) {
          updateData.priceChange24h = new Decimal(enrichedData.priceChange24h);
        }
        if (enrichedData.txCount24h) {
          updateData.txCount24h = enrichedData.txCount24h;
        }

        // Update database
        await prisma.tokenDiscovery.update({
          where: { mint: token.mint },
          data: updateData,
        });

        console.log(`${progress} ✅ Updated ${token.symbol || token.mint.slice(0, 8)} - Market Cap: ${enrichedData.marketCapUsd ? `$${(enrichedData.marketCapUsd / 1000000).toFixed(2)}M` : 'N/A'}`);
        successCount++;

        // Delay between requests to respect rate limits
        await sleep(DELAY_BETWEEN_REQUESTS);
      } catch (error: any) {
        console.error(`${progress} ❌ Failed to update ${token.symbol || token.mint.slice(0, 8)}:`, error.message);
        failCount++;

        // If we hit a rate limit, wait longer
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          console.log(`${progress} ⏸️  Rate limited - waiting 10 seconds...`);
          await sleep(10000);
        } else {
          // Normal delay for other errors
          await sleep(DELAY_BETWEEN_REQUESTS);
        }
      }

      // Progress update every 10 tokens
      if ((i + 1) % 10 === 0) {
        console.log(`\n📈 Progress: ${i + 1}/${tokensToUpdate.length} tokens processed`);
        console.log(`   ✅ Success: ${successCount} | ❌ Failed: ${failCount} | ⚠️  Skipped: ${skippedCount}\n`);
      }
    }

    console.log('\n🎉 Backfill Complete!');
    console.log(`\n📊 Final Stats:`);
    console.log(`   Total Processed: ${tokensToUpdate.length}`);
    console.log(`   ✅ Successfully Updated: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⚠️  Skipped (no data): ${skippedCount}`);
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run backfill
backfillMetadata().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
