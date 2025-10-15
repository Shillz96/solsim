// Event-driven price service with proper EventEmitter architecture
import { EventEmitter } from "events";
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

// Simple LRU Cache implementation
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists (to reinsert at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Remove oldest if at capacity
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  get size(): number {
    return this.cache.size;
  }

  forEach(callback: (value: V, key: K) => void): void {
    this.cache.forEach((value, key) => callback(value, key));
  }
}

// Circuit breaker for external API calls
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        logger.error('Circuit breaker opened after 5 failures');
      }
      throw error;
    }
  }
}

class EventDrivenPriceService extends EventEmitter {
  private priceCache = new LRUCache<string, PriceTick>(500); // LRU cache with max 500 entries
  private solPriceUsd = 100; // Default SOL price
  private updateIntervals: NodeJS.Timeout[] = [];
  private dexScreenerBreaker = new CircuitBreaker();
  private jupiterBreaker = new CircuitBreaker();

  constructor() {
    super();
    logger.info("Initializing Event-Driven Price Service");
  }

  async start() {
    logger.info("Starting Event-Driven Price Service");

    // Get initial SOL price
    await this.updateSolPrice();

    // Set up regular price updates
    const solInterval = setInterval(() => this.updateSolPrice(), 30000); // Every 30s
    const popularInterval = setInterval(() => this.updatePopularTokenPrices(), 60000); // Every 60s

    this.updateIntervals.push(solInterval, popularInterval);

    logger.info("Price service started with regular updates");
  }

  async stop() {
    logger.info("Stopping price service");
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals = [];
    this.removeAllListeners();
  }

  private async updateSolPrice() {
    try {
      logger.debug("Fetching SOL price from CoinGecko");
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.solana?.usd) {
        const oldPrice = this.solPriceUsd;
        this.solPriceUsd = data.solana.usd;

        logger.info({ oldPrice, newPrice: this.solPriceUsd }, "SOL price updated");

        // Create and emit a price tick for SOL
        const solTick: PriceTick = {
          mint: "So11111111111111111111111111111111111111112", // SOL mint address
          priceUsd: this.solPriceUsd,
          priceSol: 1, // SOL is always 1 SOL
          solUsd: this.solPriceUsd,
          timestamp: Date.now(),
          source: "coingecko",
          change24h: data.solana.usd_24h_change || 0
        };

        // Update cache and emit event
        await this.updatePrice(solTick);

      } else {
        logger.warn({ data }, "Invalid response format from CoinGecko");
      }
    } catch (error) {
      logger.error({ error }, "Failed to update SOL price");
    }
  }

  private async updatePopularTokenPrices() {
    logger.debug("Updating popular token prices");

    // Update prices for commonly traded tokens
    const popularTokens = [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
    ];

    for (const mint of popularTokens) {
      try {
        const tick = await this.fetchTokenPrice(mint);
        if (tick) {
          await this.updatePrice(tick);
        }
      } catch (error) {
        logger.warn({ mint, error }, "Failed to update token price");
      }
    }
  }

  async fetchTokenPrice(mint: string): Promise<PriceTick | null> {
    logger.debug({ mint }, "Fetching price for token");

    // Try DexScreener first (best for SPL tokens) with circuit breaker
    try {
      const dexResult = await this.dexScreenerBreaker.execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased to 8s timeout

        try {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'SolSim/1.0'
            }
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 429) {
              logger.warn({ mint }, "DexScreener rate limit hit");
              throw new Error('Rate limited');
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          if (data.pairs && data.pairs.length > 0) {
            // Sort pairs by liquidity to get most reliable price
            const sortedPairs = data.pairs.sort((a: any, b: any) => {
              const liqA = parseFloat(a.liquidity?.usd || "0");
              const liqB = parseFloat(b.liquidity?.usd || "0");
              return liqB - liqA;
            });

            const pair = sortedPairs[0];
            const priceUsd = parseFloat(pair.priceUsd || "0");

            if (priceUsd > 0) {
              logger.info({ mint, priceUsd, source: "dexscreener", liquidity: pair.liquidity?.usd }, "Price fetched successfully");
              return {
                mint,
                priceUsd,
                priceSol: priceUsd / this.solPriceUsd,
                solUsd: this.solPriceUsd,
                timestamp: Date.now(),
                source: "dexscreener",
                change24h: parseFloat(pair.priceChange?.h24 || "0"),
                volume: parseFloat(pair.volume?.h24 || "0"),
                marketCapUsd: parseFloat(pair.marketCap || "0")
              };
            }
          }
          return null;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      });

      if (dexResult) return dexResult;
    } catch (error: any) {
      if (error.message !== 'Circuit breaker is OPEN') {
        logger.warn({ mint, error: error.message }, "DexScreener fetch failed");
      }
    }

    // Try Jupiter as fallback with circuit breaker
    try {
      const jupResult = await this.jupiterBreaker.execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        try {
          const response = await fetch(`https://price.jup.ag/v6/price?ids=${mint}`, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'SolSim/1.0'
            }
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          if (data.data && data.data[mint] && data.data[mint].price) {
            const priceUsd = parseFloat(data.data[mint].price);
            if (priceUsd > 0) {
              logger.info({ mint, priceUsd, source: "jupiter" }, "Price fetched successfully");

              return {
                mint,
                priceUsd,
                priceSol: priceUsd / this.solPriceUsd,
                solUsd: this.solPriceUsd,
                timestamp: Date.now(),
                source: "jupiter"
              };
            }
          }
          return null;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      });

      if (jupResult) return jupResult;
    } catch (error: any) {
      if (error.message !== 'Circuit breaker is OPEN') {
        logger.warn({ mint, error: error.message }, "Jupiter fetch failed");
      }
    }

    logger.warn({ mint }, "No price found from any source");
    return null;
  }

  private async updatePrice(tick: PriceTick) {
    logger.debug({
      mint: tick.mint,
      priceUsd: tick.priceUsd.toFixed(6),
      source: tick.source
    }, "Price update");

    // Update in-memory cache
    this.priceCache.set(tick.mint, tick);

    // Store in Redis (optional - don't fail if Redis is unavailable)
    try {
      await redis.setex(`price:${tick.mint}`, 60, JSON.stringify(tick)); // 60s cache
      await redis.publish("prices", JSON.stringify(tick));
    } catch (error) {
      logger.warn({ error }, "Redis cache/publish failed, continuing without Redis");
    }

    // CRITICAL: Emit the event to all subscribers
    this.emit("price", tick);
    logger.debug({
      mint: tick.mint,
      subscribers: this.listenerCount('price')
    }, "Emitted price event");
  }

  // Public API methods
  async getLastTick(mint: string): Promise<PriceTick | null> {
    // For SOL, always return current price
    if (mint === "So11111111111111111111111111111111111111112") {
      return {
        mint,
        priceUsd: this.solPriceUsd,
        priceSol: 1,
        solUsd: this.solPriceUsd,
        timestamp: Date.now(),
        source: "live"
      };
    }

    // Try memory cache first
    let tick = this.priceCache.get(mint);

    // Check if cached price is stale (older than 90 seconds for near real-time updates)
    const PRICE_FRESHNESS_THRESHOLD = 90 * 1000; // 90 seconds
    const isStale = tick && (Date.now() - tick.timestamp) > PRICE_FRESHNESS_THRESHOLD;

    if (isStale && tick) {
      logger.debug({ mint, age: Date.now() - tick.timestamp }, "Cached price is stale, refetching");
      tick = undefined; // Force refetch
    }

    if (!tick) {
      // Try Redis cache
      try {
        const cached = await redis.get(`price:${mint}`);
        if (cached) {
          const redisTick = JSON.parse(cached);
          const isRedisStale = redisTick && (Date.now() - redisTick.timestamp) > PRICE_FRESHNESS_THRESHOLD;

          if (!isRedisStale && redisTick) {
            tick = redisTick;
            if (tick) {
              this.priceCache.set(mint, tick);
            }
          }
        }
      } catch (error) {
        console.warn("⚠️ Redis get failed:", error);
      }
    }

    // If still not found or stale, fetch on-demand
    if (!tick) {
      logger.debug({ mint }, "Price not in cache or stale, fetching on-demand from getLastTick");
      const fetchedTick = await this.fetchTokenPrice(mint);
      if (fetchedTick) {
        await this.updatePrice(fetchedTick);
        tick = fetchedTick;
      }
    }

    return tick || null;
  }

  /**
   * Batch fetch price ticks for multiple mints efficiently
   * Uses parallel cache checks and fetches only missing prices
   */
  async getLastTicks(mints: string[]): Promise<Map<string, PriceTick>> {
    const result = new Map<string, PriceTick>();
    const toFetch: string[] = [];
    const PRICE_FRESHNESS_THRESHOLD = 90 * 1000; // 90 seconds (near real-time updates)

    // Check memory cache first for all mints
    for (const mint of mints) {
      // Handle SOL specially
      if (mint === "So11111111111111111111111111111111111111112") {
        result.set(mint, {
          mint,
          priceUsd: this.solPriceUsd,
          priceSol: 1,
          solUsd: this.solPriceUsd,
          timestamp: Date.now(),
          source: "live"
        });
        continue;
      }

      const tick = this.priceCache.get(mint);
      const isStale = tick && (Date.now() - tick.timestamp) > PRICE_FRESHNESS_THRESHOLD;

      if (tick && !isStale) {
        result.set(mint, tick);
      } else {
        toFetch.push(mint);
      }
    }

    // If all prices are cached, return early
    if (toFetch.length === 0) {
      return result;
    }

    // Try Redis cache for missing prices (batch operation)
    try {
      const redisKeys = toFetch.map(mint => `price:${mint}`);
      const cachedValues = await redis.mget(...redisKeys);

      for (let i = 0; i < toFetch.length; i++) {
        const cached = cachedValues[i];
        if (cached) {
          try {
            const tick = JSON.parse(cached);
            const isStale = Date.now() - tick.timestamp > PRICE_FRESHNESS_THRESHOLD;

            if (!isStale && tick) {
              result.set(toFetch[i], tick);
              this.priceCache.set(toFetch[i], tick);
              // Remove from toFetch list
              toFetch[i] = '';
            }
          } catch (error) {
            logger.warn({ mint: toFetch[i], error }, "Failed to parse Redis cached price");
          }
        }
      }
    } catch (error) {
      logger.warn({ error }, "Redis batch fetch failed, continuing");
    }

    // Filter out empty strings (already found in Redis)
    const stillToFetch = toFetch.filter(mint => mint !== '');

    // Fetch remaining prices in parallel (limit concurrency to avoid rate limits)
    if (stillToFetch.length > 0) {
      logger.debug({ count: stillToFetch.length }, "Batch fetching missing prices");

      // Fetch up to 5 at a time to avoid overwhelming APIs
      const BATCH_SIZE = 5;
      for (let i = 0; i < stillToFetch.length; i += BATCH_SIZE) {
        const batch = stillToFetch.slice(i, i + BATCH_SIZE);
        const fetchPromises = batch.map(mint => this.fetchTokenPrice(mint));

        const ticks = await Promise.allSettled(fetchPromises);

        for (let j = 0; j < batch.length; j++) {
          const tickResult = ticks[j];
          if (tickResult.status === 'fulfilled' && tickResult.value) {
            const tick = tickResult.value;
            await this.updatePrice(tick);
            result.set(batch[j], tick);
          }
        }
      }
    }

    return result;
  }

  async getPrice(mint: string): Promise<number> {
    if (mint === "So11111111111111111111111111111111111111112") {
      return this.solPriceUsd;
    }

    // Try to get from cache first
    let tick = await this.getLastTick(mint);

    // If not in cache, fetch it now (on-demand)
    if (!tick) {
      logger.debug({ mint }, "Price not in cache, fetching on-demand");
      tick = await this.fetchTokenPrice(mint);
      if (tick) {
        await this.updatePrice(tick);
      }
    }

    return tick?.priceUsd || 0;
  }

  async getPrices(mints: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    // Use batch method for much better performance
    const ticksMap = await this.getLastTicks(mints);

    // Convert Map<string, PriceTick> to Record<string, number>
    for (const mint of mints) {
      const tick = ticksMap.get(mint);
      prices[mint] = tick?.priceUsd || 0;
    }

    return prices;
  }

  getSolPrice(): number {
    return this.solPriceUsd;
  }

  // Subscription methods using EventEmitter
  onPriceUpdate(callback: (tick: PriceTick) => void): () => void {
    this.on("price", callback);
    logger.debug({ totalSubscribers: this.listenerCount('price') }, "Added price subscriber");

    // Return unsubscribe function
    return () => {
      this.off("price", callback);
      logger.debug({ totalSubscribers: this.listenerCount('price') }, "Removed price subscriber");
    };
  }

  // Legacy compatibility method
  subscribe(callback: (tick: PriceTick) => void): () => void {
    return this.onPriceUpdate(callback);
  }

  // Debug methods
  getStats() {
    return {
      solPrice: this.solPriceUsd,
      cachedPrices: this.priceCache.size,
      priceSubscribers: this.listenerCount('price'),
      lastUpdate: Date.now()
    };
  }

  getAllCachedPrices(): Record<string, PriceTick> {
    const result: Record<string, PriceTick> = {};
    this.priceCache.forEach((tick, mint) => {
      result[mint] = tick;
    });
    return result;
  }
}

// Export singleton instance
const priceServiceV2 = new EventDrivenPriceService();
export default priceServiceV2;