/**
 * Backfill Missing Token Metadata
 * 
 * Fetches metadata from pump.fun API for all tokens missing symbol/name
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillMetadata() {
  console.log('🔍 Finding tokens with missing metadata...');

  const tokensWithoutMetadata = await prisma.tokenDiscovery.findMany({
    where: {
      OR: [
        { symbol: null },
        { name: null },
        { symbol: '' },
        { name: '' },
      ],
    },
    select: {
      mint: true,
      symbol: true,
      name: true,
    },
    orderBy: {
      firstSeenAt: 'desc',
    },
    take: 500, // Process first 500
  });

  console.log(`📊 Found ${tokensWithoutMetadata.length} tokens missing metadata`);

  let updated = 0;
  let failed = 0;

  for (const token of tokensWithoutMetadata) {
    try {
      console.log(`🔄 Fetching metadata for ${token.mint}...`);

      const response = await fetch(`https://frontend-api.pump.fun/coins/${token.mint}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.log(`⚠️  pump.fun API returned ${response.status} for ${token.mint}`);
        failed++;
        continue;
      }

      const coinData = await response.json();

      if (!coinData.name || !coinData.symbol) {
        console.log(`⚠️  No metadata found for ${token.mint}`);
        failed++;
        continue;
      }

      await prisma.tokenDiscovery.update({
        where: { mint: token.mint },
        data: {
          symbol: coinData.symbol,
          name: coinData.name,
          description: coinData.description || null,
          imageUrl: coinData.image_uri || null,
          twitter: coinData.twitter || null,
          telegram: coinData.telegram || null,
          website: coinData.website || null,
          lastUpdatedAt: new Date(),
        },
      });

      console.log(`✅ Updated ${token.mint}: ${coinData.symbol} / ${coinData.name}`);
      updated++;

      // Rate limit: 200ms delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      console.error(`❌ Error processing ${token.mint}:`, error.message);
      failed++;
    }
  }

  console.log(`\n✨ Backfill complete: ${updated} updated, ${failed} failed`);
  await prisma.$disconnect();
}

backfillMetadata().catch(console.error);
