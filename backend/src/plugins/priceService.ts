// Price service - re-exports the optimized implementation
// The actual implementation is in priceService-optimized.ts

import optimizedPriceService from "./priceService-optimized.js";

// Re-export the singleton instance
export default optimizedPriceService;

/*
 * ARCHITECTURE NOTE (Updated 2025):
 *
 * The price service uses an optimized event-driven architecture with:
 * 1. Helius Standard WebSocket for real-time DEX swap monitoring (FREE on Developer plan!)
 * 2. Multi-layer caching with LRU cache + Redis for fast lookups
 * 3. Negative caching to avoid repeated queries for non-existent tokens
 * 4. Request coalescing to prevent duplicate concurrent API calls
 * 5. Circuit breakers that intelligently handle expected vs. unexpected failures
 * 6. DexScreener batch fetching (up to 30 tokens per request) for efficiency
 * 7. Stale-while-revalidate pattern for better UX
 *
 * Key optimizations for Helius Developer Plan (10M credits, 50 req/s):
 * - WebSocket subscriptions via logsSubscribe (no credit cost!)
 * - Aggressive caching to minimize API calls to DexScreener/Jupiter
 * - Batch processing to reduce API call count by ~30x
 * - Smart rate limiting with backoff to avoid 429 errors
 *
 * This approach provides real-time price updates (1-2s latency) while being
 * highly reliable, cost-effective, and scalable for production use.
 */
