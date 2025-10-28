/**
 * Fix Market Cap Values in Database
 * 
 * This script re-fetches market cap data from DexScreener for all tokens
 * to replace FDV values with actual market cap values.
 * 
 * Run with: npx tsx src/scripts/fix-market-cap-values.ts
 */

import prisma from '../plugins/prisma.js';
import { fetchJSON } from '../utils/fetch.js';

interface DexScreenerPair {
  baseToken: {
    address: string;
    symbol: string;
    name: string;
  };
  priceUsd: string;
  marketCap: number;
  fdv: number;
  volume: {
    h24: number;
  };
  priceChange: {
    h24: number;
  };
  liquidity: {
    usd: number;
  };
}

async function fixMarketCapValues() {
  console.log('🔧 Starting market cap fix for TokenDiscovery table...\n');

  // Get all tokens from TokenDiscovery
  const tokens = await prisma.tokenDiscovery.findMany({
    where: {
      status: { not: 'DEAD' },
      marketCapUsd: { not: null }
    },
    select: {
      mint: true,
      symbol: true,
      marketCapUsd: true,
      priceUsd: true
    },
    orderBy: {
      marketCapUsd: 'desc'
    }
  });

  console.log(`📊 Found ${tokens.length} tokens with market cap data\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const progress = `[${i + 1}/${tokens.length}]`;
    
    try {
      // Fetch fresh data from DexScreener
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.mint}`, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SolSim/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`${progress} ⏸️  Rate limited - waiting 60 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 60000));
          i--; // Retry this token
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      const pairs = data?.pairs || [];

      if (pairs.length === 0) {
        console.log(`${progress} ⚠️  ${token.symbol} - No pairs found`);
        skipped++;
        continue;
      }

      // Get best pair by liquidity
      const sortedPairs = pairs.sort((a: DexScreenerPair, b: DexScreenerPair) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      const bestPair = sortedPairs[0];

      // ✅ Use marketCap (NOT fdv)
      const correctMarketCap = bestPair.marketCap || bestPair.fdv;
      const oldMarketCap = token.marketCapUsd ? parseFloat(token.marketCapUsd.toString()) : 0;

      // Calculate difference
      const difference = correctMarketCap - oldMarketCap;
      const percentChange = oldMarketCap > 0 ? ((difference / oldMarketCap) * 100) : 0;

      // Only update if there's a significant difference (more than 5% or $1000)
      if (Math.abs(percentChange) > 5 || Math.abs(difference) > 1000) {
        await prisma.tokenDiscovery.update({
          where: { mint: token.mint },
          data: {
            marketCapUsd: correctMarketCap,
            priceUsd: parseFloat(bestPair.priceUsd || '0'),
            volume24h: bestPair.volume?.h24 || null,
            priceChange24h: bestPair.priceChange?.h24 || null,
            lastUpdatedAt: new Date()
          }
        });

        console.log(
          `${progress} ✅ ${token.symbol?.padEnd(10)} | ` +
          `Old: $${oldMarketCap.toLocaleString().padEnd(12)} | ` +
          `New: $${correctMarketCap.toLocaleString().padEnd(12)} | ` +
          `Change: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`
        );
        updated++;
      } else {
        console.log(`${progress} ⏭️  ${token.symbol} - No significant change`);
        skipped++;
      }

      // Rate limiting: Wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`${progress} ❌ ${token.symbol} - Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n📈 Summary:');
  console.log(`   ✅ Updated: ${updated} tokens`);
  console.log(`   ⏭️  Skipped: ${skipped} tokens`);
  console.log(`   ❌ Failed: ${failed} tokens`);
  console.log('\n✨ Market cap fix complete!\n');
}

// Run the script
fixMarketCapValues()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
