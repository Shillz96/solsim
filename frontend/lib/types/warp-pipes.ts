/**
 * Warp Pipes Hub - TypeScript Types
 *
 * Type definitions for the token discovery and tracking system.
 * Includes types for bonded, graduating, and new tokens with health metrics.
 */

/**
 * Token state in the migration lifecycle
 */
export type TokenState = 'bonded' | 'graduating' | 'new';

/**
 * Pool type for migrated tokens
 */
export type PoolType = 'pumpswap' | 'raydium' | 'meteora';

/**
 * Health status levels for visual indicators
 */
export type HealthLevel = 'green' | 'yellow' | 'red';

/**
 * Main token data structure for Warp Pipes Hub
 */
export interface TokenRow {
  mint: string;
  symbol: string;
  name: string;
  logoURI?: string;
  state: TokenState;

  // Health capsule metrics
  liqUsd?: number;
  poolAgeMin?: number;
  priceImpactPctAt1pct?: number;
  freezeRevoked: boolean;
  mintRenounced: boolean;
  creatorVerified?: boolean;

  // Bonding curve data (for bonded/graduating)
  bondingCurveProgress?: number; // 0-100%
  bondingCurveKey?: string;

  // Pool data (for new tokens)
  poolAddress?: string;
  poolType?: PoolType;
  poolCreatedAt?: string; // ISO timestamp

  // Trending metrics
  hotScore: number;
  watcherCount: number;
  isWatched?: boolean; // Computed per user on frontend

  // Timestamps
  firstSeenAt: string; // ISO timestamp
  lastUpdatedAt: string; // ISO timestamp
  stateChangedAt: string; // ISO timestamp
}

/**
 * Health capsule status for a token
 */
export interface HealthStatus {
  liquidity: HealthLevel;
  priceImpact: HealthLevel;
  security: HealthLevel; // Based on freeze/mint authority
  overall: HealthLevel; // Computed aggregate
}

/**
 * Watch preferences for a token
 */
export interface WatchPreferences {
  notifyOnGraduation: boolean;
  notifyOnMigration: boolean;
  notifyOnPriceChange: boolean;
}

/**
 * User's watch entry
 */
export interface TokenWatch {
  id: string;
  userId: string;
  mint: string;
  notifyOnGraduation: boolean;
  notifyOnMigration: boolean;
  notifyOnPriceChange: boolean;
  currentState: TokenState;
  createdAt: string; // ISO timestamp
}

/**
 * API response for the token feed
 */
export interface WarpPipesFeedResponse {
  bonded: TokenRow[];
  graduating: TokenRow[];
  new: TokenRow[];
}

/**
 * Filter options for the token feed
 */
export interface FeedFilters {
  searchQuery?: string;
  sortBy?: 'hot' | 'new' | 'watched' | 'alphabetical';
  minLiquidity?: number;
  onlyWatched?: boolean;
}

/**
 * Request body for adding a watch
 */
export interface AddWatchRequest {
  mint: string;
  preferences?: Partial<WatchPreferences>;
}

/**
 * Request body for updating watch preferences
 */
export interface UpdateWatchRequest {
  preferences: Partial<WatchPreferences>;
}

/**
 * Health thresholds for color-coding
 */
export const HEALTH_THRESHOLDS = {
  liquidity: {
    green: 50000, // $50k+
    yellow: 10000, // $10k - $50k
    // Below $10k = red
  },
  priceImpact: {
    green: 1, // < 1% impact
    yellow: 5, // 1-5% impact
    // > 5% = red
  },
} as const;

/**
 * Helper to determine health level from liquidity
 */
export function getLiquidityHealth(liqUsd?: number): HealthLevel {
  if (!liqUsd) return 'red';
  if (liqUsd >= HEALTH_THRESHOLDS.liquidity.green) return 'green';
  if (liqUsd >= HEALTH_THRESHOLDS.liquidity.yellow) return 'yellow';
  return 'red';
}

/**
 * Helper to determine health level from price impact
 */
export function getPriceImpactHealth(priceImpact?: number): HealthLevel {
  if (!priceImpact) return 'yellow';
  if (priceImpact <= HEALTH_THRESHOLDS.priceImpact.green) return 'green';
  if (priceImpact <= HEALTH_THRESHOLDS.priceImpact.yellow) return 'yellow';
  return 'red';
}

/**
 * Helper to determine security health from freeze/mint status
 */
export function getSecurityHealth(
  freezeRevoked: boolean,
  mintRenounced: boolean
): HealthLevel {
  if (freezeRevoked && mintRenounced) return 'green';
  if (freezeRevoked || mintRenounced) return 'yellow';
  return 'red';
}

/**
 * Compute overall health status for a token
 */
export function computeHealthStatus(token: TokenRow): HealthStatus {
  const liquidity = getLiquidityHealth(token.liqUsd);
  const priceImpact = getPriceImpactHealth(token.priceImpactPctAt1pct);
  const security = getSecurityHealth(token.freezeRevoked, token.mintRenounced);

  // Overall = worst of the three
  const levels: HealthLevel[] = [liquidity, priceImpact, security];
  const overall: HealthLevel =
    levels.includes('red') ? 'red' :
    levels.includes('yellow') ? 'yellow' :
    'green';

  return { liquidity, priceImpact, security, overall };
}

/**
 * Sort comparator functions
 */
export const SORT_COMPARATORS = {
  hot: (a: TokenRow, b: TokenRow) => Number(b.hotScore) - Number(a.hotScore),
  new: (a: TokenRow, b: TokenRow) =>
    new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
  watched: (a: TokenRow, b: TokenRow) => b.watcherCount - a.watcherCount,
  alphabetical: (a: TokenRow, b: TokenRow) =>
    (a.symbol || '').localeCompare(b.symbol || ''),
} as const;
