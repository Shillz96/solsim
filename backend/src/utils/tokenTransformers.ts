/**
 * Token Data Transformation Utilities
 * 
 * Centralizes token data transformation logic from various sources
 * (Solana Tracker, Pump.fun, etc.) into a standardized format.
 */

export interface StandardizedToken {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap: number;
  imageUrl: string | null;
  lastUpdated: string;
  trendScore: number;
  source?: string;
  holders?: number;
  supply?: number;
  createdTimestamp?: number;
  reason?: string; // Why this token is trending (for frontend display)
  category?: 'gainers' | 'losers' | 'volume' | 'new'; // Token category
}

/**
 * Transform Solana Tracker API token data to standardized format
 */
export function transformSolanaTrackerToken(token: any, source: string = 'solana-tracker'): StandardizedToken {
  // Determine trending reason based on price change
  let reason = 'Trending';
  const priceChange = parseFloat(token.priceChange24h?.toString() || '0');
  if (priceChange > 10) {
    reason = `📈 Up ${priceChange.toFixed(1)}% in 24h`;
  } else if (priceChange < -10) {
    reason = `📉 Down ${Math.abs(priceChange).toFixed(1)}% in 24h`;
  } else if (parseFloat(token.volume24h?.toString() || '0') > 1000000) {
    reason = '🔥 High volume trading';
  }

  return {
    tokenAddress: token.address || token.mint || '',
    tokenSymbol: token.symbol || 'UNKNOWN',
    tokenName: token.name || 'Unknown Token',
    price: parseFloat(token.price?.toString() || '0'),
    priceChange24h: priceChange,
    priceChangePercent24h: priceChange,
    volume24h: parseFloat(token.volume24h?.toString() || '0'),
    marketCap: parseFloat(token.marketCap?.toString() || '0'),
    imageUrl: token.image || token.logo || null,
    lastUpdated: new Date().toISOString(),
    trendScore: parseFloat(token.score?.toString() || '8.0'),
    source,
    holders: token.holders,
    supply: token.supply ? parseFloat(token.supply.toString()) : undefined,
    reason,
  };
}

/**
 * Transform Pump.fun API token data to standardized format
 * Includes bonding curve price calculation
 */
export function transformPumpFunToken(token: any, solPriceUsd: number = 140): StandardizedToken {
  // Calculate price using bonding curve formula
  const virtualSolReserves = parseFloat(token.virtual_sol_reserves?.toString() || '0');
  const virtualTokenReserves = parseFloat(token.virtual_token_reserves?.toString() || '0');
  const price = virtualTokenReserves > 0 
    ? (virtualSolReserves / virtualTokenReserves) * solPriceUsd 
    : 0;
  
  // Estimate volume as 10% of market cap (Pump.fun doesn't provide volume)
  const marketCap = parseFloat(token.usd_market_cap?.toString() || '0');
  const estimatedVolume = marketCap * 0.1;

  return {
    tokenAddress: token.mint || '',
    tokenSymbol: token.symbol || 'UNKNOWN',
    tokenName: token.name || 'Unknown Token',
    price,
    priceChange24h: 0, // Pump.fun doesn't provide historical data
    priceChangePercent24h: 0,
    volume24h: estimatedVolume,
    marketCap,
    imageUrl: token.image_uri || null,
    lastUpdated: new Date().toISOString(),
    trendScore: 7.5, // Good default score for fresh tokens
    source: 'pump.fun',
    createdTimestamp: token.created_timestamp || Date.now(),
    reason: '🚀 Fresh launch on Pump.fun', // Fresh tokens get special badge
    category: 'new' as const,
  };
}

/**
 * Filter Pump.fun tokens for quality
 * Only returns tokens with active bonding curves and sufficient market cap
 */
export function filterPumpFunTokens(tokens: any[], minMarketCap: number = 5000): any[] {
  return tokens.filter((token: any) => {
    const marketCap = parseFloat(token.usd_market_cap?.toString() || '0');
    return marketCap > minMarketCap && !token.complete; // Active bonding curves only
  });
}

/**
 * Deduplicate tokens by address, keeping the first occurrence
 */
export function deduplicateTokens(tokens: StandardizedToken[]): StandardizedToken[] {
  const uniqueTokens = new Map<string, StandardizedToken>();
  
  tokens.forEach(token => {
    if (token.tokenAddress && !uniqueTokens.has(token.tokenAddress)) {
      uniqueTokens.set(token.tokenAddress, token);
    }
  });
  
  return Array.from(uniqueTokens.values());
}

/**
 * Sort tokens by trend score (descending)
 */
export function sortByTrendScore(tokens: StandardizedToken[]): StandardizedToken[] {
  return [...tokens].sort((a, b) => b.trendScore - a.trendScore);
}
