/**
 * Application Constants
 * Centralized configuration values for consistent behavior
 */

export const LIMITS = {
  // Pagination and list limits
  TRENDING_MAX: 100,
  TRENDING_DEFAULT: 20,
  SEARCH_MAX: 50,
  SEARCH_DEFAULT: 10,
  PRICES_MAX: 20,
  
  // User profile limits
  PROFILE_DISPLAY_NAME_MAX: 50,
  PROFILE_BIO_MAX: 500,
  PROFILE_HANDLE_MAX: 50,
  PROFILE_URL_MAX: 255,
  
  // Trading limits
  TRADE_AMOUNT_MAX: 1000000, // 1M SOL
  TRADE_AMOUNT_MIN: 0.000001, // Minimum trade amount
  
  // Balance limits
  BALANCE_MAX: 1000000, // 1M SOL maximum balance
  BALANCE_DEFAULT: 100000, // 100K SOL starting balance
  
  // Cache and timeout limits
  TOKEN_INFO_TIMEOUT: 10000, // 10 seconds
  WARNING_CACHE_SIZE: 1000, // Max warning cache entries
  WARNING_CACHE_TTL: 300000, // 5 minutes
} as const;

export const VALIDATION_PATTERNS = {
  // Solana address: base58, 32-44 chars, no 0OIl
  SOLANA_ADDRESS: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  
  // Username: alphanumeric + underscores, 3-20 chars
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  
  // Password: 8+ chars, uppercase, lowercase, number
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  
  // Social handles: alphanumeric + underscores/dashes
  SOCIAL_HANDLE: /^[a-zA-Z0-9_-]{1,50}$/,
} as const;

export const ERROR_MESSAGES = {
  // Authentication
  AUTH_REQUIRED: 'Authentication required',
  AUTH_INVALID: 'Invalid authentication token',
  AUTH_EXPIRED: 'Authentication token expired',
  
  // Authorization
  FORBIDDEN: 'Access forbidden',
  ADMIN_REQUIRED: 'Admin access required',
  
  // Validation
  INVALID_INPUT: 'Invalid input provided',
  INVALID_ADDRESS: 'Invalid Solana address format',
  INVALID_AMOUNT: 'Invalid trade amount',
  INVALID_URL: 'Invalid URL format',
  
  // Not Found
  USER_NOT_FOUND: 'User not found',
  TOKEN_NOT_FOUND: 'Token not found',
  TRADE_NOT_FOUND: 'Trade not found',
  
  // Server Errors
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
} as const;

export const CACHE_KEYS = {
  TOKEN_PRICE: (address: string) => `price:${address}`,
  TOKEN_INFO: (address: string) => `info:${address}`,
  USER_PORTFOLIO: (userId: string) => `portfolio:${userId}`,
  TRENDING_TOKENS: 'trending:tokens',
  SOL_PRICE: 'price:sol',
} as const;

export const TIMEOUTS = {
  TOKEN_INFO: 10000, // 10 seconds
  PRICE_FETCH: 5000, // 5 seconds
  DATABASE_QUERY: 30000, // 30 seconds
} as const;
