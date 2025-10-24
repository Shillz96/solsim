/**
 * Market Sentiment Service
 * 
 * Fetches market sentiment indicators:
 * - Fear & Greed Index from Alternative.me
 * - Altcoin Season Index from CoinMarketCap
 * 
 * Data is cached in Redis with 5-minute TTL.
 */

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || '');

const CACHE_TTL = 300; // Cache for 5 minutes (300 seconds)

interface FearGreedData {
  value: number | null;
  classification: string | null;
}

interface AltcoinSeasonData {
  value: number | null;
}

/**
 * Fetch Fear & Greed Index from Alternative.me
 * API docs: https://alternative.me/crypto/fear-and-greed-index/
 */
export async function getFearGreedIndex(): Promise<FearGreedData> {
  try {
    // Try cache first
    const cached = await redis.get('market:fear-greed');
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from Alternative.me API (no API key required)
    const response = await fetch('https://api.alternative.me/fng/', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Fear & Greed API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const latestData = data?.data?.[0];

    const result: FearGreedData = {
      value: latestData?.value ? parseInt(latestData.value, 10) : null,
      classification: latestData?.value_classification || null,
    };

    // Cache for 5 minutes
    await redis.setex('market:fear-greed', CACHE_TTL, JSON.stringify(result));

    return result;
  } catch (error: any) {
    console.error('[FearGreed] Error fetching index:', error.message);
    
    // Return nulls on error
    return {
      value: null,
      classification: null,
    };
  }
}

/**
 * Fetch Altcoin Season Index from BlockchainCenter
 * API docs: https://www.blockchaincenter.net/altcoin-season-index/
 */
export async function getAltcoinSeasonIndex(): Promise<AltcoinSeasonData> {
  try {
    // Try cache first
    const cached = await redis.get('market:altcoin-season');
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from BlockchainCenter API
    const response = await fetch('https://api.blockchaincenter.net/v1/altcoin-season-index', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Altcoin Season API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const result: AltcoinSeasonData = {
      value: data?.altcoin_season_index || null,
    };

    // Cache for 5 minutes
    await redis.setex('market:altcoin-season', CACHE_TTL, JSON.stringify(result));

    return result;
  } catch (error: any) {
    console.error('[AltcoinSeason] Error fetching index:', error.message);
    
    // Return nulls on error
    return {
      value: null,
    };
  }
}

/**
 * Warm up the cache on startup
 */
export async function warmupSentimentCache() {
  console.log('[MarketSentiment] Warming up cache...');
  await Promise.all([
    getFearGreedIndex(),
    getAltcoinSeasonIndex(),
  ]);
  console.log('✅ [MarketSentiment] Cache warmed');
}

// Auto-refresh cache every 5 minutes
let refreshInterval: NodeJS.Timeout | null = null;

export function startSentimentRefresh() {
  if (refreshInterval) return; // Already running

  console.log('[MarketSentiment] Starting auto-refresh (5min interval)');
  
  // Initial warmup
  warmupSentimentCache();

  // Refresh every 5 minutes
  refreshInterval = setInterval(async () => {
    try {
      await warmupSentimentCache();
    } catch (error) {
      console.error('[MarketSentiment] Error during auto-refresh:', error);
    }
  }, CACHE_TTL * 1000);
}

export function stopSentimentRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('[MarketSentiment] Auto-refresh stopped');
  }
}
