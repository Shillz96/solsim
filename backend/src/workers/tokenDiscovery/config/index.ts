/**
 * Token Discovery Worker Configuration
 *
 * Centralized configuration with environment variable support
 */

// ============================================================================
// UPDATE INTERVALS
// ============================================================================

export const intervals = {
  // CRITICAL FIX (2025-10-31): Eliminate database checkpoint storm
  // Root cause: ~147,600 UPDATE queries/hour overwhelmed database with WAL traffic
  // Solution: Redis-first architecture with batch database writes
  HOT_SCORE_UPDATE: parseInt(process.env.HOT_SCORE_UPDATE_INTERVAL || '900000'), // 15 minutes (was 5min - 67% reduction)
  WATCHER_SYNC: parseInt(process.env.WATCHER_SYNC_INTERVAL || '300000'), // 5 minutes (was 1min - 80% reduction)
  CLEANUP: parseInt(process.env.CLEANUP_INTERVAL || '86400000'), // 24 hours (daily aggressive cleanup)
  HOLDER_COUNT_UPDATE: parseInt(process.env.HOLDER_COUNT_UPDATE_INTERVAL || '600000'), // 10 minutes
  MARKET_DATA_UPDATE: parseInt(process.env.MARKET_DATA_UPDATE_INTERVAL || '300000'), // 5 minutes (was 90s - 70% reduction)
  REDIS_TO_DB_SYNC: parseInt(process.env.REDIS_TO_DB_SYNC_INTERVAL || '120000'), // 2 minutes - EMERGENCY FIX: Reduced from 10min to prevent buffer backlog during high traffic
  TOKEN_SUBSCRIPTION: parseInt(process.env.TOKEN_SUBSCRIPTION_INTERVAL || '300000'), // 5 minutes
  HEALTH_CHECK: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'), // 60 seconds
  ACTIVITY_POLL: parseInt(process.env.ACTIVITY_POLL_INTERVAL || '30000'), // 30 seconds
} as const;

// ============================================================================
// CACHE TTL
// ============================================================================

export const cache = {
  TOKEN_TTL: parseInt(process.env.TOKEN_TTL || '7200'), // 2 hours (was 1h - longer Redis retention)
  HOLDER_COUNT_CACHE_MIN: parseInt(process.env.HOLDER_COUNT_CACHE_MIN || '5'), // 5 minutes
  PRICE_TTL: parseInt(process.env.PRICE_TTL || '300'), // 5 minutes
  TRADE_TTL: parseInt(process.env.TRADE_TTL || '3600'), // 1 hour
  TRADER_STATS_TTL: parseInt(process.env.TRADER_STATS_TTL || '86400'), // 24 hours
} as const;

// ============================================================================
// RETENTION PERIODS
// ============================================================================

export const retention = {
  NEW_TOKEN_HOURS: parseInt(process.env.NEW_TOKEN_RETENTION_HOURS || '48'), // Keep NEW tokens for 48h
  BONDED_TOKEN_HOURS: parseInt(process.env.BONDED_TOKEN_RETENTION_HOURS || '24'), // Keep BONDED for 24h
  IDLE_THRESHOLD_MS: parseInt(process.env.IDLE_THRESHOLD_MS || '600000'), // 10 minutes
} as const;

// ============================================================================
// KNOWN MINTS
// ============================================================================

export const knownMints = {
  SOL: process.env.SOL_MINT || 'So11111111111111111111111111111111111111112',
  USDC: process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: process.env.USDT_MINT || 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
} as const;

// ============================================================================
// RATE LIMITS & THRESHOLDS
// ============================================================================

export const limits = {
  RATE_LIMIT_DELAY_MS: parseInt(process.env.RATE_LIMIT_DELAY_MS || '500'), // 500ms between API calls (safer for DexScreener)
  MIN_ACTIVE_VOLUME_SOL: parseFloat(process.env.MIN_ACTIVE_VOLUME_SOL || '0.5'), // 0.5 SOL minimum
  MIN_HOLDERS_COUNT: parseInt(process.env.MIN_HOLDERS_COUNT || '10'), // 10 holders minimum
  MAX_TRADES_PER_TOKEN: parseInt(process.env.MAX_TRADES_PER_TOKEN || '100'), // 100 trades
  MAX_ACTIVE_TOKENS_SUBSCRIPTION: parseInt(process.env.MAX_ACTIVE_TOKENS_SUBSCRIPTION || '500'), // 500 tokens
  MAX_TOKENS_PER_BATCH: parseInt(process.env.MAX_TOKENS_PER_BATCH || '50'), // Batch size for updates
  MAX_HOLDER_COUNT_BATCH: parseInt(process.env.MAX_HOLDER_COUNT_BATCH || '100'), // 100 tokens per batch
} as const;

// ============================================================================
// STATE CLASSIFICATION THRESHOLDS (GMGN/Photon style - show tokens EARLY)
// ============================================================================

export const stateThresholds = {
  DEAD_TOKEN_HOURS: parseInt(process.env.DEAD_TOKEN_HOURS || '4'), // 4 hours (was 2h - less aggressive)
  MIN_DEAD_VOLUME_SOL: parseFloat(process.env.MIN_DEAD_VOLUME_SOL || '0.1'), // 0.1 SOL (was 0.5)
  ACTIVE_TOKEN_HOURS: parseInt(process.env.ACTIVE_TOKEN_HOURS || '2'), // 2 hours (was 1h)
  ABOUT_TO_BOND_PROGRESS: parseInt(process.env.ABOUT_TO_BOND_PROGRESS || '70'), // 70% (was 75)
  ABOUT_TO_BOND_MINUTES: parseInt(process.env.ABOUT_TO_BOND_MINUTES || '30'), // 30 minutes (was 60)
  GRADUATING_MIN_PROGRESS: parseInt(process.env.GRADUATING_MIN_PROGRESS || '40'), // 40%
  GRADUATING_MAX_PROGRESS: parseInt(process.env.GRADUATING_MAX_PROGRESS || '100'), // 100%
  NEW_TOKEN_MAX_PROGRESS: parseInt(process.env.NEW_TOKEN_MAX_PROGRESS || '40'), // 40%
} as const;

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

export const database = {
  CONNECTION_LIMIT: parseInt(process.env.WORKER_DB_CONNECTION_LIMIT || '15'), // EMERGENCY FIX + Railway Pro: Increased from 8 → 15 (32GB RAM can handle it)
  POOL_TIMEOUT: parseInt(process.env.WORKER_DB_POOL_TIMEOUT || '30'),
  STATEMENT_CACHE_SIZE: parseInt(process.env.WORKER_DB_STATEMENT_CACHE_SIZE || '2000'), // Increased from 500 → 2000 (more RAM = bigger cache)
} as const;

// ============================================================================
// SHUTDOWN
// ============================================================================

export const shutdown = {
  GRACE_PERIOD_MS: parseInt(process.env.SHUTDOWN_GRACE_PERIOD_MS || '5000'), // 5 seconds
  DB_DISCONNECT_TIMEOUT_MS: parseInt(process.env.DB_DISCONNECT_TIMEOUT_MS || '10000'), // 10 seconds
} as const;

// ============================================================================
// LIQUIDITY & SCORING
// ============================================================================

export const scoring = {
  BONDING_CURVE_TARGET_SOL: parseInt(process.env.BONDING_CURVE_TARGET_SOL || '85'), // 85 SOL target
  LIQUIDITY_SCORE_TARGET_USD: parseInt(process.env.LIQUIDITY_SCORE_TARGET_USD || '50000'), // $50k = 100 points
  WATCHER_SCORE_MULTIPLIER: parseInt(process.env.WATCHER_SCORE_MULTIPLIER || '10'), // Each watcher = 10 points
  MAX_WATCHER_SCORE: parseInt(process.env.MAX_WATCHER_SCORE || '100'), // Cap at 100
  RECENCY_WEIGHT: parseFloat(process.env.RECENCY_WEIGHT || '0.5'), // 50%
  LIQUIDITY_WEIGHT: parseFloat(process.env.LIQUIDITY_WEIGHT || '0.3'), // 30%
  WATCHER_WEIGHT: parseFloat(process.env.WATCHER_WEIGHT || '0.2'), // 20%
  INITIAL_HOT_SCORE: parseInt(process.env.INITIAL_HOT_SCORE || '100'), // New tokens start at 100
  DIRECT_LISTING_HOT_SCORE: parseInt(process.env.DIRECT_LISTING_HOT_SCORE || '80'), // Direct Raydium = 80
  PUMP_TOTAL_SUPPLY: parseInt(process.env.PUMP_TOTAL_SUPPLY || '1000000000'), // 1 billion tokens
} as const;

// ============================================================================
// VALIDATION
// ============================================================================

export const validation = {
  MIN_TIMESTAMP_YEAR: parseInt(process.env.MIN_TIMESTAMP_YEAR || '2020'),
  MAX_TIMESTAMP_YEAR: parseInt(process.env.MAX_TIMESTAMP_YEAR || '2050'),
  TIMESTAMP_EPOCH_THRESHOLD: parseInt(process.env.TIMESTAMP_EPOCH_THRESHOLD || '4102444800'), // Year 2100 in seconds
} as const;

// ============================================================================
// EXPORT COMBINED CONFIG
// ============================================================================

export const config = {
  intervals,
  cache,
  retention,
  knownMints,
  limits,
  stateThresholds,
  database,
  shutdown,
  scoring,
  validation,
} as const;

export default config;
