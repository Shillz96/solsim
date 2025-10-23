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
  // 1) BASIC TOKEN INFO
  mint: string;
  symbol: string;
  name: string;
  logoURI?: string | null;
  description?: string | null;
  imageUrl?: string | null;

  // 2) SOCIAL LINKS
  twitter?: string | null;
  telegram?: string | null;
  website?: string | null;

  // 3) TOKEN STATE
  state: TokenState;
  previousState?: string | null;
  stateChangedAt?: string | null;
  firstSeenAt?: string | null;

  // 4) SECURITY METRICS
  freezeRevoked?: boolean | null;
  mintRenounced?: boolean | null;
  creatorVerified?: boolean | null;

  // 5) LIQUIDITY & TRADING
  liqUsd?: number | null;
  priceImpactPctAt1pct?: number | null;
  poolAgeMin?: number | null;

  // 6) MARKET DATA
  marketCapUsd?: number | null;
  volume24h?: number | null;
  volumeChange24h?: number | null;
  priceUsd?: number | null;
  priceChange24h?: number | null;
  txCount24h?: number | null;
  holderCount?: number | null;

  // 6.5) CREATOR DATA
  creatorWallet?: string | null;

  // 7) BONDING CURVE
  bondingCurveProgress?: number | null;
  bondingCurveKey?: string | null;
  vSolInBondingCurve?: number | null;

  // 8) POOL DATA
  poolAddress?: string | null;
  poolType?: PoolType | null;
  poolCreatedAt?: string | null;

  // 9) COMMUNITY METRICS
  hotScore?: number | null;
  watcherCount?: number | null;
  isWatched?: boolean | null;
  lastUpdatedAt?: string | null;
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
  sortBy?: 'hot' | 'new' | 'watched' | 'alphabetical' | 'volume';
  minLiquidity?: number;
  onlyWatched?: boolean;
  requireSecurity?: boolean;
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
export function getLiquidityHealth(liqUsd?: number | null): HealthLevel {
  if (!liqUsd) return 'red';
  if (liqUsd >= HEALTH_THRESHOLDS.liquidity.green) return 'green';
  if (liqUsd >= HEALTH_THRESHOLDS.liquidity.yellow) return 'yellow';
  return 'red';
}

/**
 * Helper to determine health level from price impact
 */
export function getPriceImpactHealth(priceImpact?: number | null): HealthLevel {
  if (!priceImpact) return 'yellow';
  if (priceImpact <= HEALTH_THRESHOLDS.priceImpact.green) return 'green';
  if (priceImpact <= HEALTH_THRESHOLDS.priceImpact.yellow) return 'yellow';
  return 'red';
}

/**
 * Helper to determine security health from freeze/mint status
 */
export function getSecurityHealth(
  freezeRevoked?: boolean | null,
  mintRenounced?: boolean | null
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
  volume: (a: TokenRow, b: TokenRow) => (b.volume24h ?? 0) - (a.volume24h ?? 0),
  hot: (a: TokenRow, b: TokenRow) => (b.hotScore ?? 0) - (a.hotScore ?? 0),
  new: (a: TokenRow, b: TokenRow) => {
    const aTime = a.firstSeenAt ? new Date(a.firstSeenAt).getTime() : 0;
    const bTime = b.firstSeenAt ? new Date(b.firstSeenAt).getTime() : 0;
    return bTime - aTime;
  },
  watched: (a: TokenRow, b: TokenRow) => (b.watcherCount ?? 0) - (a.watcherCount ?? 0),
  alphabetical: (a: TokenRow, b: TokenRow) =>
    (a.symbol || '').localeCompare(b.symbol || ''),
} as const;
