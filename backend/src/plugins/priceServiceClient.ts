/**
 * Lightweight Price Service Client for Worker Service
 *
 * This client reads prices from Redis cache ONLY - no WebSocket connections.
 * Used by the worker service to avoid duplicate WebSocket connections.
 *
 * The main backend price service (priceService-optimized.ts) handles:
 * - WebSocket connections (Helius + PumpPortal)
 * - Price fetching from external APIs
 * - Writing to Redis cache
 *
 * This client simply READS from the cache populated by the main service.
 */

import redis from "./redis.js";
import { loggers } from "../utils/logger.js";

const logger = loggers.priceService;

interface PriceTick {
  mint: string;
  priceUsd: number;
  priceSol?: number;
  solUsd?: number;
  marketCapUsd?: number;
  timestamp: number;
  source: string;
  volume?: number;
  change24h?: number;
}

/**
 * Redis-only price service client
 * No external connections - reads from cache only
 */
class PriceServiceClient {
  private solPriceUsd = 100;

  /**
   * Initialize client
   * No WebSocket connections needed
   */
  async start() {
    logger.info("🔌 Initializing PriceServiceClient (Redis-only mode for worker)");

    // Get initial SOL price from cache
    await this.updateSolPriceFromCache();

    // Update SOL price from cache every 30 seconds
    setInterval(() => this.updateSolPriceFromCache(), 30000);

    logger.info("✅ PriceServiceClient ready (reading from Redis cache)");
  }

  /**
   * Update SOL price from Redis cache
   */
  private async updateSolPriceFromCache() {
    try {
      const cached = await redis.get("price:So11111111111111111111111111111111111111112");
      if (cached) {
        const tick = JSON.parse(cached) as PriceTick;
        if (tick.priceUsd && tick.priceUsd > 0) {
          const oldPrice = this.solPriceUsd;
          this.solPriceUsd = tick.priceUsd;

          if (Math.abs(oldPrice - this.solPriceUsd) > 1) {
            logger.info({ oldPrice, newPrice: this.solPriceUsd }, "SOL price updated from cache");
          }
        }
      }
    } catch (err) {
      logger.warn({ error: err }, "Failed to fetch SOL price from cache, using last known");
    }
  }

  /**
   * Get current SOL/USD price
   */
  getSolPrice(): number {
    return this.solPriceUsd;
  }

  /**
   * Get price for a single token from Redis cache
   */
  async getPrice(mint: string): Promise<number> {
    // SOL is special-cased
    if (mint === "So11111111111111111111111111111111111111112") {
      return this.solPriceUsd;
    }

    try {
      const cached = await redis.get(`price:${mint}`);
      if (cached) {
        const tick = JSON.parse(cached) as PriceTick;

        // Validate price is not stale (older than 5 minutes)
        const age = Date.now() - tick.timestamp;
        if (age > 5 * 60 * 1000) {
          logger.debug({
            mint: mint.slice(0, 8),
            age: Math.round(age / 1000)
          }, "Cached price is stale");
          return 0;
        }

        return tick.priceUsd || 0;
      }
    } catch (err) {
      logger.warn({ mint: mint.slice(0, 8), error: err }, "Failed to fetch price from cache");
    }

    return 0;
  }

  /**
   * Get last tick for a token from Redis cache
   */
  async getLastTick(mint: string): Promise<PriceTick | null> {
    // SOL is special-cased
    if (mint === "So11111111111111111111111111111111111111112") {
      return {
        mint,
        priceUsd: this.solPriceUsd,
        priceSol: 1,
        solUsd: this.solPriceUsd,
        timestamp: Date.now(),
        source: "cache"
      };
    }

    try {
      const cached = await redis.get(`price:${mint}`);
      if (cached) {
        const tick = JSON.parse(cached) as PriceTick;

        // Validate price is not too stale (older than 5 minutes)
        const age = Date.now() - tick.timestamp;
        if (age > 5 * 60 * 1000) {
          logger.debug({
            mint: mint.slice(0, 8),
            age: Math.round(age / 1000)
          }, "Cached tick is stale");
          return null;
        }

        return tick;
      }
    } catch (err) {
      logger.warn({ mint: mint.slice(0, 8), error: err }, "Failed to fetch tick from cache");
    }

    return null;
  }

  /**
   * Batch get prices for multiple tokens from Redis cache
   */
  async getPrices(mints: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    if (mints.length === 0) return prices;

    try {
      const keys = mints.map(m => `price:${m}`);
      const values = await redis.mget(...keys);

      for (let i = 0; i < mints.length; i++) {
        const mint = mints[i];

        // SOL is special-cased
        if (mint === "So11111111111111111111111111111111111111112") {
          prices[mint] = this.solPriceUsd;
          continue;
        }

        const cachedValue = values[i];
        if (cachedValue) {
          try {
            const tick = JSON.parse(cachedValue) as PriceTick;

            // Check staleness
            const age = Date.now() - tick.timestamp;
            if (age <= 5 * 60 * 1000) { // 5 minutes
              prices[mint] = tick.priceUsd || 0;
            } else {
              prices[mint] = 0;
            }
          } catch (parseErr) {
            logger.debug({ mint: mint.slice(0, 8) }, "Failed to parse cached price");
            prices[mint] = 0;
          }
        } else {
          prices[mint] = 0;
        }
      }
    } catch (err) {
      logger.error({ error: err }, "Failed to batch fetch prices from cache");
      // Return zeros for all mints on error
      for (const mint of mints) {
        prices[mint] = 0;
      }
    }

    return prices;
  }

  /**
   * Get service stats
   */
  getStats() {
    return {
      mode: "redis-client",
      solPrice: this.solPriceUsd,
      wsConnected: false, // This client doesn't maintain WebSocket connections
      description: "Lightweight Redis-only client for worker service"
    };
  }

  /**
   * No-op stop (no connections to close)
   */
  async stop() {
    logger.info("PriceServiceClient stopped (no connections to close)");
  }
}

// Export singleton instance
const priceServiceClient = new PriceServiceClient();
export default priceServiceClient;
