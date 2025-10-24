/**
 * Market Sentiment Service
 * 
 * Fetches market sentiment indicators from CoinMarketCap:
 * - Fear & Greed Index (via cmcService)
 * - Altcoin Season Index (via cmcService)
 * 
 * This service now acts as a facade to the CMC service for backwards compatibility.
 * Data is cached in Redis with 60 second TTL by the CMC service.
 */

import { getCMCFearGreed, getCMCAltcoinSeasonIndex } from './cmcService.js';

interface FearGreedData {
  value: number | null;
  classification: string | null;
}

interface AltcoinSeasonData {
  value: number | null;
}

/**
 * Fetch Fear & Greed Index from CoinMarketCap
 */
export async function getFearGreedIndex(): Promise<FearGreedData> {
  const data = await getCMCFearGreed();
  return {
    value: data.value,
    classification: data.classification,
  };
}

/**
 * Fetch Altcoin Season Index from CoinMarketCap
 */
export async function getAltcoinSeasonIndex(): Promise<AltcoinSeasonData> {
  const data = await getCMCAltcoinSeasonIndex();
  return {
    value: data.value,
  };
}

/**
 * Warm up the cache on startup
 */
export async function warmupSentimentCache() {
  console.log('[MarketSentiment] Warming up cache (delegating to CMC service)...');
  await Promise.all([
    getFearGreedIndex(),
    getAltcoinSeasonIndex(),
  ]);
  console.log('✅ [MarketSentiment] Cache warmed');
}

/**
 * @deprecated - Sentiment refresh is now handled by CMC service
 * This function is kept for backwards compatibility but does nothing
 */
export function startSentimentRefresh() {
  console.log('[MarketSentiment] Note: Sentiment data is now auto-refreshed by CMC service');
}

/**
 * @deprecated - Sentiment refresh is now handled by CMC service
 */
export function stopSentimentRefresh() {
  console.log('[MarketSentiment] Note: Sentiment data refresh is managed by CMC service');
}
