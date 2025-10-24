/**
 * CoinMarketCap Service
 * 
 * Fetches global cryptocurrency market data from CoinMarketCap API:
 * - Total market cap
 * - BTC dominance
 * - 24h trading volume
 * - Fear & Greed Index
 * - Altcoin Season Index (calculated from 90d performance)
 * 
 * Data is cached in Redis with 60 second TTL to respect rate limits.
 */

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || '');

const CMC_API_KEY = process.env.CMC_API_KEY || '4a113ea7110c42ddbe713fcc40f5d8e5';
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com';
const CACHE_TTL = 900; // Cache for 15 minutes (900 seconds) to stay within 10K/month free tier

interface CMCGlobalMetrics {
  totalMarketCapUsd: number | null;
  btcDominancePct: number | null;
  totalVolume24hUsd: number | null;
}

interface CMCFearGreed {
  value: number | null;
  classification: string | null;
  timestamp: string | null;
}

interface CMCAltcoinSeason {
  value: number | null; // 0-100 scale
  timestamp: string | null;
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
    const response = await fetch(`${CMC_BASE_URL}/v1/global-metrics/quotes/latest`, {
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
 * Fetch Fear & Greed Index from CoinMarketCap
 * Uses CMC's /v3/fear-and-greed/historical endpoint
 */
export async function getCMCFearGreed(): Promise<CMCFearGreed> {
  try {
    // Try cache first
    const cached = await redis.get('market:cmc:fear-greed');
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from CMC API
    const response = await fetch(`${CMC_BASE_URL}/v3/fear-and-greed/historical?limit=1`, {
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CMC Fear & Greed API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const latest = data?.data?.[0];

    const result: CMCFearGreed = {
      value: latest?.value ?? null,
      classification: latest?.value_classification ?? null,
      timestamp: latest?.timestamp ?? null,
    };

    // Cache for 60 seconds
    await redis.setex('market:cmc:fear-greed', CACHE_TTL, JSON.stringify(result));

    return result;
  } catch (error: any) {
    console.error('[CMC] Error fetching Fear & Greed:', error.message);
    
    // Return nulls on error
    return {
      value: null,
      classification: null,
      timestamp: null,
    };
  }
}

/**
 * Fetch Altcoin Season Index from CoinMarketCap
 * Calculates based on CMC's methodology: % of top coins outperforming BTC over 90 days
 * Scale: 0-100 (≥75 = Altseason)
 */
export async function getCMCAltcoinSeasonIndex(): Promise<CMCAltcoinSeason> {
  try {
    // Try cache first
    const cached = await redis.get('market:cmc:altcoin-season');
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch top 120 coins with 90d performance data
    const url = new URL(`${CMC_BASE_URL}/v1/cryptocurrency/listings/latest`);
    url.searchParams.set('limit', '120');
    url.searchParams.set('convert', 'USD');
    url.searchParams.set('aux', 'tags');

    const response = await fetch(url.toString(), {
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CMC Listings API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const listings = data?.data ?? [];

    // Find BTC's 90d change
    const btc = listings.find((coin: any) => coin.symbol === 'BTC');
    const btc90d = btc?.quote?.USD?.percent_change_90d;

    if (typeof btc90d !== 'number') {
      console.warn('[CMC] BTC 90d change not available');
      return { value: null, timestamp: null };
    }

    // Exclude stablecoins and wrapped tokens
    const EXCLUDED_SYMBOLS = new Set([
      'USDT', 'USDC', 'DAI', 'WBTC', 'WETH', 'FDUSD', 'TUSD', 
      'USDE', 'PYUSD', 'USDS', 'stETH', 'BUSD', 'FRAX'
    ]);
    const EXCLUDED_TAGS = new Set(['stablecoin', 'wrapped-tokens', 'asset-backed']);

    const isExcluded = (coin: any) => {
      if (coin.symbol === 'BTC' || EXCLUDED_SYMBOLS.has(coin.symbol)) return true;
      if (!coin.tags) return false;
      return coin.tags.some((tag: string) => EXCLUDED_TAGS.has(tag));
    };

    // Filter to top 100 valid coins
    const validCoins = listings
      .filter((coin: any) => !isExcluded(coin))
      .slice(0, 100);

    // Count coins outperforming BTC
    const outperformers = validCoins.filter((coin: any) => {
      const change90d = coin?.quote?.USD?.percent_change_90d;
      return typeof change90d === 'number' && change90d > btc90d;
    }).length;

    // Calculate index (0-100 scale)
    const value = validCoins.length > 0 
      ? Math.round((outperformers / validCoins.length) * 100)
      : null;

    const result: CMCAltcoinSeason = {
      value,
      timestamp: data?.status?.timestamp ?? null,
    };

    // Cache for 60 seconds
    await redis.setex('market:cmc:altcoin-season', CACHE_TTL, JSON.stringify(result));

    console.log(`[CMC] Altcoin Season: ${value}/100 (${outperformers}/${validCoins.length} coins beat BTC)`);

    return result;
  } catch (error: any) {
    console.error('[CMC] Error fetching Altcoin Season:', error.message);
    
    // Return nulls on error
    return {
      value: null,
      timestamp: null,
    };
  }
}

/**
 * Warm up the cache on startup
 */
export async function warmupCMCCache() {
  console.log('[CMC] Warming up cache...');
  await Promise.all([
    getCMCGlobalMetrics(),
    getCMCFearGreed(),
    getCMCAltcoinSeasonIndex(),
  ]);
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
      await Promise.all([
        getCMCGlobalMetrics(),
        getCMCFearGreed(),
        getCMCAltcoinSeasonIndex(),
      ]);
    } catch (error) {
      console.error('[CMC] Error during auto-refresh:', error);
    }
  }, CACHE_TTL * 1000);
}

export function stopCMCRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('[CMC] Auto-refresh stopped');
  }
}
