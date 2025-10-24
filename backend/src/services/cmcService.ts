/**
 * CoinMarketCap Service
 * 
 * Fetches global cryptocurrency market data from CoinMarketCap API:
 * - Total market cap
 * - BTC dominance
 * - 24h trading volume
 * 
 * Data is cached in Redis with 60 second TTL to respect rate limits.
 */

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || '');

const CMC_API_KEY = process.env.CMC_API_KEY || '4a113ea7-110c-42dd-be71-3fcc40f5d8e5';
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';
const CACHE_TTL = 60; // Cache for 60 seconds

interface CMCGlobalMetrics {
  totalMarketCapUsd: number | null;
  btcDominancePct: number | null;
  totalVolume24hUsd: number | null;
}

/**
 * Fetch global market metrics from CoinMarketCap
 */
export async function getCMCGlobalMetrics(): Promise<CMCGlobalMetrics> {
  try {
    // Try cache first
    const cached = await redis.get('market:cmc:global');
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from CMC API
    const response = await fetch(`${CMC_BASE_URL}/global-metrics/quotes/latest`, {
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CMC API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const quote = data?.data?.quote?.USD;

    const result: CMCGlobalMetrics = {
      totalMarketCapUsd: quote?.total_market_cap || null,
      btcDominancePct: data?.data?.btc_dominance || null,
      totalVolume24hUsd: quote?.total_volume_24h || null,
    };

    // Cache for 60 seconds
    await redis.setex('market:cmc:global', CACHE_TTL, JSON.stringify(result));

    return result;
  } catch (error: any) {
    console.error('[CMC] Error fetching global metrics:', error.message);
    
    // Return nulls on error
    return {
      totalMarketCapUsd: null,
      btcDominancePct: null,
      totalVolume24hUsd: null,
    };
  }
}

/**
 * Warm up the cache on startup
 */
export async function warmupCMCCache() {
  console.log('[CMC] Warming up cache...');
  await getCMCGlobalMetrics();
  console.log('✅ [CMC] Cache warmed');
}

// Auto-refresh cache every 60 seconds
let refreshInterval: NodeJS.Timeout | null = null;

export function startCMCRefresh() {
  if (refreshInterval) return; // Already running

  console.log('[CMC] Starting auto-refresh (60s interval)');
  
  // Initial warmup
  warmupCMCCache();

  // Refresh every 60 seconds
  refreshInterval = setInterval(async () => {
    try {
      await getCMCGlobalMetrics();
    } catch (error) {
      console.error('[CMC] Error during auto-refresh:', error);
    }
  }, 60000);
}

export function stopCMCRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('[CMC] Auto-refresh stopped');
  }
}
