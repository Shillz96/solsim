/**
 * Solana Tracker Configuration Constants
 * 
 * Centralizes configuration values for the Solana Tracker integration
 */

/**
 * Token source weighting for trending tokens
 * Determines the mix of tokens from different sources
 */
export const TOKEN_SOURCE_WEIGHTS = {
  /** Solana Tracker trending tokens (established tokens) */
  SOLANA_TRACKER: 0.7,
  
  /** Pump.fun fresh tokens (new meme coins) */
  PUMP_FUN: 0.3,
} as const;

/**
 * Cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  /** Standard cache for successful responses */
  STANDARD: 300, // 5 minutes
  
  /** Reduced cache for fallback responses */
  FALLBACK: 180, // 3 minutes
  
  /** Short cache for error fallbacks */
  ERROR_FALLBACK: 60, // 1 minute
} as const;

/**
 * API configuration
 */
export const API_CONFIG = {
  /** Base URL for Solana Tracker API */
  BASE_URL: 'https://data.solanatracker.io',
  
  /** Base URL for Pump.fun API */
  PUMP_FUN_URL: 'https://frontend-api-v3.pump.fun',
  
  /** API request timeout (milliseconds) */
  TIMEOUT_MS: 10000,
  
  /** User agent for API requests */
  USER_AGENT: 'SolSim-Trading-Platform/1.0',
} as const;

/**
 * Token filtering thresholds
 */
export const TOKEN_FILTERS = {
  /** Minimum market cap for Pump.fun tokens (USD) */
  MIN_MARKET_CAP: 5000,
  
  /** Default SOL price for calculations (USD) */
  DEFAULT_SOL_PRICE: 140,
  
  /** Volume estimation multiplier for Pump.fun tokens */
  VOLUME_ESTIMATE_MULTIPLIER: 0.1,
} as const;

/**
 * Pagination limits
 */
export const PAGINATION = {
  /** Default limit for trending tokens */
  DEFAULT_LIMIT: 20,
  
  /** Maximum limit for trending tokens */
  MAX_LIMIT: 50,
  
  /** Pump.fun API fetch limit */
  PUMP_FUN_FETCH_LIMIT: 20,
} as const;

/**
 * Default trend scores for different token types
 */
export const DEFAULT_TREND_SCORES = {
  /** Solana Tracker tokens */
  SOLANA_TRACKER: 8.0,
  
  /** Pump.fun fresh tokens */
  PUMP_FUN: 7.5,
  
  /** Latest tokens (fallback) */
  LATEST: 0,
  
  /** Popular established tokens */
  ESTABLISHED: 9.5,
} as const;
