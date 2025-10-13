// Price service - re-exports the event-driven implementation
// The actual implementation is in priceService-v2.ts

import priceServiceV2 from "./priceService-v2.js";

// Re-export the singleton instance
export default priceServiceV2;

/*
 * ARCHITECTURE NOTE:
 *
 * The price service uses a simplified event-driven architecture that:
 * 1. Polls external APIs (CoinGecko, DexScreener, Jupiter) for price updates
 * 2. Updates prices every 30-60 seconds
 * 3. Broadcasts via EventEmitter to WebSocket subscribers
 *
 * A full Helius WebSocket implementation for real-time swap event monitoring
 * was previously attempted but removed due to complexity and reliability issues.
 *
 * Future enhancement: Implement Helius logsSubscribe for DEX program monitoring
 * to get real-time price updates from on-chain swap events.
 *
 * For now, the polling approach provides sufficient price freshness for
 * paper trading while being more reliable and easier to debug.
 */
