/**
 * Backfill Missing Token Metadata (Symbol, Name, Logo)
 *
 * Fetches on-chain metadata for tokens with NULL symbol/name/logoURI.
 * Uses Helius RPC to get token metadata from the blockchain.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-missing-metadata.ts
 */

import { PrismaClient } from '@prisma/client';
import { tokenMetadataService } from '../services/tokenMetadataService.js';
import { HeliusClient } from '../services/heliusapi.js';

// Set DATABASE_URL if not already set (for Railway connection)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@metro.proxy.rlwy.net:13936/railway';
}

const prisma = new PrismaClient();
const helius = new HeliusClient({ 
  apiKey: process.env.HELIUS_API_KEY || 'YOUR_HELIUS_KEY_HERE' 
});

// Configuration
const BATCH_SIZE = 20; // Process 20 tokens at a time
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second between requests
const MAX_TOKENS = 500; // Limit total tokens to process

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfillMissingMetadata() {
  console.log('🔄 Starting Token Metadata Backfill (Symbol/Name/Logo)...\n');

  try {
    // Find tokens with missing symbol OR name OR logoURI
    const tokensToUpdate = await prisma.tokenDiscovery.findMany({
      where: {
        state: 'new', // Focus on NEW tokens first (they're showing on Warp Pipes)
        OR: [
          { symbol: null },
          { name: null },
          { logoURI: null },
        ],
      },
      orderBy: {
        firstSeenAt: 'desc', // Start with newest tokens
      },
      take: MAX_TOKENS,
    });

    console.log(`📊 Found ${tokensToUpdate.length} NEW tokens missing metadata\n`);

    if (tokensToUpdate.length === 0) {
      console.log('✅ All NEW tokens have metadata!');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < tokensToUpdate.length; i++) {
      const token = tokensToUpdate[i];
      const progress = `[${i + 1}/${tokensToUpdate.length}]`;

      try {
        console.log(`${progress} Fetching metadata for ${token.mint.slice(0, 8)}...`);

        // Fetch on-chain asset data from Helius DAS API
        const asset = await helius.getAsset(token.mint);

        if (!asset || !asset.content) {
          console.log(`${progress} ⚠️  No asset data found for ${token.mint.slice(0, 8)}`);
          skippedCount++;
          await sleep(500);
          continue;
        }

        // Extract metadata from asset
        const symbol = asset.content.metadata?.symbol || asset.content.json_uri?.symbol;
        const name = asset.content.metadata?.name || asset.content.json_uri?.name;
        let imageUrl = asset.content.files?.[0]?.uri || asset.content.links?.image;

        // Convert IPFS URLs to HTTP
        if (imageUrl && imageUrl.startsWith('ipfs://')) {
          const ipfsHash = imageUrl.replace('ipfs://', '');
          imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
        }

        // Also try fetching from JSON URI if available
        let metadataUri = asset.content.json_uri;
        let additionalMetadata: any = {};
        if (metadataUri) {
          try {
            // Convert IPFS to HTTP
            if (metadataUri.startsWith('ipfs://')) {
              const ipfsHash = metadataUri.replace('ipfs://', '');
              metadataUri = `https://ipfs.io/ipfs/${ipfsHash}`;
            }
            additionalMetadata = await tokenMetadataService.fetchMetadataFromIPFS(metadataUri);
          } catch (err) {
            // Ignore errors fetching from IPFS
          }
        }

        if (!symbol && !name && !imageUrl && !additionalMetadata.symbol && !additionalMetadata.name) {
          console.log(`${progress} ⚠️  No metadata found for ${token.mint.slice(0, 8)}`);
          skippedCount++;
          await sleep(500);
          continue;
        }

        // Prepare update data (only update fields that are currently NULL)
        const updateData: any = {
          lastUpdatedAt: new Date(),
        };

        // Use direct metadata or fallback to additionalMetadata
        const finalSymbol = symbol || additionalMetadata.symbol;
        const finalName = name || additionalMetadata.name;
        const finalImage = imageUrl || additionalMetadata.imageUrl;

        if (finalSymbol && !token.symbol) {
          updateData.symbol = finalSymbol;
        }
        if (finalName && !token.name) {
          updateData.name = finalName;
        }
        if (finalImage && !token.logoURI) {
          updateData.logoURI = finalImage;
          updateData.imageUrl = finalImage;
        }
        if (additionalMetadata.description && !token.description) {
          updateData.description = additionalMetadata.description;
        }
        if (additionalMetadata.twitter) updateData.twitter = additionalMetadata.twitter;
        if (additionalMetadata.telegram) updateData.telegram = additionalMetadata.telegram;
        if (additionalMetadata.website) updateData.website = additionalMetadata.website;

        // Only update if we have something to update
        if (Object.keys(updateData).length <= 1) { // Only lastUpdatedAt
          console.log(`${progress} ⚠️  No new metadata for ${token.mint.slice(0, 8)}`);
          skippedCount++;
          await sleep(500);
          continue;
        }

        // Update database
        await prisma.tokenDiscovery.update({
          where: { mint: token.mint },
          data: updateData,
        });

        console.log(
          `${progress} ✅ Updated ${finalSymbol || token.mint.slice(0, 8)} - ` +
          `Symbol: ${finalSymbol ? '✓' : '✗'} | ` +
          `Name: ${finalName ? '✓' : '✗'} | ` +
          `Logo: ${finalImage ? '✓' : '✗'}`
        );
        successCount++;

        // Delay between requests
        await sleep(DELAY_BETWEEN_REQUESTS);
      } catch (error: any) {
        console.error(`${progress} ❌ Failed to update ${token.mint.slice(0, 8)}:`, error.message);
        failCount++;
        await sleep(DELAY_BETWEEN_REQUESTS);
      }

      // Progress update every 10 tokens
      if ((i + 1) % 10 === 0) {
        console.log(`\n📈 Progress: ${i + 1}/${tokensToUpdate.length} tokens processed`);
        console.log(
          `   ✅ Success: ${successCount} | ❌ Failed: ${failCount} | ⚠️  Skipped: ${skippedCount}\n`
        );
      }
    }

    console.log('\n🎉 Backfill Complete!');
    console.log(`   ✅ Updated: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   📊 Total: ${tokensToUpdate.length}`);
  } catch (error) {
    console.error('❌ Fatal error during backfill:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillMissingMetadata().catch(console.error);
