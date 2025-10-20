/**
 * Optimized Price Service for Helius Developer Plan
 *
 * Key optimizations for Developer plan (10M credits, 50 req/s):
 * - Standard WebSockets for real-time DEX monitoring (no credit cost!)
 * - Aggressive multi-layer caching to minimize API calls
 * - Stale-while-revalidate pattern for better UX
 * - Circuit breakers to prevent credit waste on failing APIs
 * - Smart batching to respect rate limits
 */

import { EventEmitter } from "events";
import WebSocket from "ws";
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

// LRU Cache implementation
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
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
  private readonly timeout = 60000;

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

/**
 * Optimized Price Service using Standard WebSockets (free on Developer plan!)
 */
class OptimizedPriceService extends EventEmitter {
  private priceCache = new LRUCache<string, PriceTick>(2000); // Larger cache for better hit rate
  private solPriceUsd = 100;
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private updateIntervals: NodeJS.Timeout[] = [];
  private dexScreenerBreaker = new CircuitBreaker();
  private jupiterBreaker = new CircuitBreaker();

  // WebSocket reconnection
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private reconnectDelay = 1000;
  private readonly MAX_RECONNECT_DELAY = 60000;
  private isReconnecting = false;
  private shouldReconnect = true;

  // DEX programs to monitor via WebSocket (Standard API - FREE!)
  private readonly DEX_PROGRAMS = [
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium V4 (most active)
    "CAMMCzo5YL8w4VFF8KVHrK22GGUQpMpTFb6xRmpLFGNnSm", // Raydium CLMM
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",  // Pump.fun
  ];

  private readonly HELIUS_WS_URL: string;

  constructor() {
    super();

    const apiKey = process.env.HELIUS_API;
    if (!apiKey) {
      throw new Error("HELIUS_API environment variable is required");
    }

    // Standard WebSocket endpoint (works on all plans)
    this.HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${apiKey}`;

    logger.info("Initializing Optimized Price Service (Developer Plan)");
  }

  async start() {
    logger.info("Starting Optimized Price Service");

    // Get initial SOL price
    await this.updateSolPrice();

    // Set up regular SOL price updates (every 30s)
    const solInterval = setInterval(() => this.updateSolPrice(), 30000);
    this.updateIntervals.push(solInterval);

    // Connect to Helius Standard WebSocket (no credit cost!)
    await this.connectWebSocket();

    logger.info("✅ Price service started with WebSocket streaming (Developer plan optimized)");
  }

  private async connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.warn("WebSocket already connected");
      return;
    }

    try {
      logger.info("🔌 Connecting to Helius Standard WebSocket...");
      this.ws = new WebSocket(this.HELIUS_WS_URL);

      this.ws.on('open', () => {
        logger.info("✅ WebSocket connected successfully");

        // Reset reconnection state
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isReconnecting = false;

        // Subscribe to DEX program logs (Standard API - logsSubscribe)
        this.subscribeToPrograms();

        // Start health checks (ping every 30s as per Helius best practices)
        this.startHealthChecks();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleWebSocketMessage(data);
      });

      this.ws.on('error', (error: Error) => {
        logger.error({ error: error.message }, "WebSocket error");
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        logger.warn({ code, reason: reason.toString() }, "WebSocket closed");

        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        if (this.shouldReconnect) {
          this.reconnect();
        }
      });

      this.ws.on('pong', () => {
        logger.debug("Pong received");
      });

    } catch (error) {
      logger.error({ error }, "Failed to create WebSocket connection");
      this.reconnect();
    }
  }

  private subscribeToPrograms() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error("Cannot subscribe: WebSocket not connected");
      return;
    }

    // Subscribe to each DEX program using logsSubscribe (Standard API)
    this.DEX_PROGRAMS.forEach((programId, index) => {
      const subscribeRequest = {
        jsonrpc: "2.0",
        id: index + 1,
        method: "logsSubscribe",
        params: [
          {
            mentions: [programId]
          },
          {
            commitment: "confirmed"
          }
        ]
      };

      this.ws!.send(JSON.stringify(subscribeRequest));
    });

    logger.info({ programs: this.DEX_PROGRAMS.length }, "📡 Subscribed to DEX programs via logsSubscribe");
  }

  private startHealthChecks() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Ping every 30 seconds (Helius best practice)
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        logger.debug("Ping sent");
      }
    }, 30000);
  }

  private handleWebSocketMessage(data: WebSocket.Data) {
    try {
      const messageStr = data.toString('utf8');
      const message = JSON.parse(messageStr);

      // Handle subscription confirmation
      if (message.result !== undefined && message.id) {
        logger.info({ subscriptionId: message.result, id: message.id }, "Subscription confirmed");
        return;
      }

      // Handle log notifications
      if (message.method === "logsNotification" && message.params?.result) {
        this.processLogNotification(message.params.result);
      }

    } catch (error) {
      logger.error({ error }, "Failed to parse WebSocket message");
    }
  }

  private async processLogNotification(logData: any) {
    try {
      const signature = logData.value?.signature;
      const logs = logData.value?.logs || [];

      logger.debug({ signature: signature?.slice(0, 16) }, "DEX activity detected");

      // TODO: Parse logs to extract token swaps and update prices
      // For now, the WebSocket infrastructure is ready but we continue
      // using fallback APIs for actual price data

    } catch (error) {
      logger.error({ error }, "Failed to process log notification");
    }
  }

  private reconnect() {
    if (this.isReconnecting) return;

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error("Maximum reconnection attempts reached");
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    logger.info(
      {
        attempt: this.reconnectAttempts,
        maxAttempts: this.MAX_RECONNECT_ATTEMPTS,
        delay: this.reconnectDelay
      },
      "Attempting to reconnect"
    );

    setTimeout(async () => {
      try {
        await this.connectWebSocket();
      } catch (error) {
        logger.error({ error }, "Reconnection failed");
      }

      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.MAX_RECONNECT_DELAY);
      this.isReconnecting = false;
    }, this.reconnectDelay);
  }

  private async updateSolPrice() {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true"
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.solana?.usd) {
        const oldPrice = this.solPriceUsd;
        this.solPriceUsd = data.solana.usd;

        logger.info({ oldPrice, newPrice: this.solPriceUsd }, "SOL price updated");

        const solTick: PriceTick = {
          mint: "So11111111111111111111111111111111111111112",
          priceUsd: this.solPriceUsd,
          priceSol: 1,
          solUsd: this.solPriceUsd,
          timestamp: Date.now(),
          source: "coingecko",
          change24h: data.solana.usd_24h_change || 0
        };

        await this.updatePrice(solTick);
      }
    } catch (error) {
      logger.error({ error }, "Failed to update SOL price");
    }
  }

  async fetchTokenPrice(mint: string): Promise<PriceTick | null> {
    logger.debug({ mint }, "Fetching price for token");

    // Try DexScreener first (best for SPL tokens)
    try {
      const dexResult = await this.dexScreenerBreaker.execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
          const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
            {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'VirtualSol/1.0'
              }
            }
          );
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
            const sortedPairs = data.pairs.sort((a: any, b: any) => {
              const liqA = parseFloat(a.liquidity?.usd || "0");
              const liqB = parseFloat(b.liquidity?.usd || "0");
              return liqB - liqA;
            });

            const pair = sortedPairs[0];
            const priceUsd = parseFloat(pair.priceUsd || "0");

            if (priceUsd > 0) {
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

    // Try Jupiter as fallback
    try {
      const jupResult = await this.jupiterBreaker.execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
          const response = await fetch(
            `https://price.jup.ag/v6/price?ids=${mint}`,
            {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'VirtualSol/1.0'
              }
            }
          );
          clearTimeout(timeoutId);

          if (!response.ok) {
            if (response.status === 204) return null;
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          if (data.data && data.data[mint] && data.data[mint].price) {
            const priceUsd = parseFloat(data.data[mint].price);
            if (priceUsd > 0) {
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
      if (error.message !== 'Circuit breaker is OPEN' && !error.message.includes('204')) {
        logger.warn({ mint, error: error.message }, "Jupiter fetch failed");
      }
    }

    // Try pump.fun as last resort
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`https://frontend-api.pump.fun/coins/${mint}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VirtualSol/1.0'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        if (data && data.usd_market_cap) {
          const supply = 1_000_000_000;
          const priceUsd = data.usd_market_cap / supply;

          if (priceUsd > 0) {
            return {
              mint,
              priceUsd,
              priceSol: priceUsd / this.solPriceUsd,
              solUsd: this.solPriceUsd,
              timestamp: Date.now(),
              source: "pump.fun",
              marketCapUsd: data.usd_market_cap
            };
          }
        }
      }
    } catch (error: any) {
      logger.debug({ mint, error: error.message }, "Pump.fun fetch failed");
    }

    logger.debug({ mint }, "No price found from any source");
    return null;
  }

  private async updatePrice(tick: PriceTick) {
    this.priceCache.set(tick.mint, tick);

    try {
      await redis.setex(`price:${tick.mint}`, 60, JSON.stringify(tick));
      await redis.publish("prices", JSON.stringify(tick));
    } catch (error) {
      logger.warn({ error }, "Redis cache/publish failed");
    }

    this.emit("price", tick);
  }

  async getLastTick(mint: string): Promise<PriceTick | null> {
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

    let tick = this.priceCache.get(mint);
    const PRICE_FRESHNESS_THRESHOLD = 10 * 1000; // 10s
    const PRICE_MAX_AGE = 60 * 1000; // 60s
    const isStale = tick && (Date.now() - tick.timestamp) > PRICE_FRESHNESS_THRESHOLD;
    const isTooOld = tick && (Date.now() - tick.timestamp) > PRICE_MAX_AGE;

    // Stale-while-revalidate: return stale data, refresh in background
    if (isStale && tick && !isTooOld) {
      this.fetchTokenPrice(mint).then(freshTick => {
        if (freshTick) this.updatePrice(freshTick);
      }).catch(err => {
        logger.warn({ mint, error: err }, "Background refresh failed");
      });
      return tick;
    }

    if (isTooOld || !tick) {
      if (!tick) {
        try {
          const cached = await redis.get(`price:${mint}`);
          if (cached) {
            const redisTick = JSON.parse(cached);
            const isRedisTooOld = redisTick && (Date.now() - redisTick.timestamp) > PRICE_MAX_AGE;
            if (!isRedisTooOld && redisTick) {
              tick = redisTick;
              if (tick) this.priceCache.set(mint, tick);
            }
          }
        } catch (error) {
          logger.warn({ error }, "Redis get failed");
        }
      }

      if (isTooOld || !tick) {
        const fetchedTick = await this.fetchTokenPrice(mint);
        if (fetchedTick) {
          await this.updatePrice(fetchedTick);
          tick = fetchedTick;
        }
      }
    }

    return tick || null;
  }

  async getLastTicks(mints: string[]): Promise<Map<string, PriceTick>> {
    const result = new Map<string, PriceTick>();
    const toFetch: string[] = [];
    const toRefreshInBackground: string[] = [];
    const PRICE_FRESHNESS_THRESHOLD = 10 * 1000;
    const PRICE_MAX_AGE = 60 * 1000;

    for (const mint of mints) {
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
      const age = tick ? Date.now() - tick.timestamp : Infinity;
      const isStale = tick && age > PRICE_FRESHNESS_THRESHOLD;
      const isTooOld = tick && age > PRICE_MAX_AGE;

      if (tick && !isStale) {
        result.set(mint, tick);
      } else if (tick && isStale && !isTooOld) {
        result.set(mint, tick);
        toRefreshInBackground.push(mint);
      } else {
        toFetch.push(mint);
      }
    }

    if (toRefreshInBackground.length > 0) {
      Promise.all(
        toRefreshInBackground.map(mint =>
          this.fetchTokenPrice(mint).then(tick => {
            if (tick) this.updatePrice(tick);
          }).catch(err => {
            logger.warn({ mint, error: err }, "Background refresh failed");
          })
        )
      );
    }

    if (toFetch.length === 0) return result;

    try {
      const redisKeys = toFetch.map(mint => `price:${mint}`);
      const cachedValues = await redis.mget(...redisKeys);

      for (let i = 0; i < toFetch.length; i++) {
        const cached = cachedValues[i];
        if (cached) {
          try {
            const tick = JSON.parse(cached);
            const age = Date.now() - tick.timestamp;
            const isTooOld = age > PRICE_MAX_AGE;

            if (!isTooOld && tick) {
              result.set(toFetch[i], tick);
              this.priceCache.set(toFetch[i], tick);
              toFetch[i] = '';
            }
          } catch (error) {
            logger.warn({ mint: toFetch[i], error }, "Failed to parse Redis cached price");
          }
        }
      }
    } catch (error) {
      logger.warn({ error }, "Redis batch fetch failed");
    }

    const stillToFetch = toFetch.filter(mint => mint !== '');

    if (stillToFetch.length > 0) {
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

    let tick = await this.getLastTick(mint);

    if (!tick) {
      tick = await this.fetchTokenPrice(mint);
      if (tick) {
        await this.updatePrice(tick);
      }
    }

    return tick?.priceUsd || 0;
  }

  async getPrices(mints: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const ticksMap = await this.getLastTicks(mints);

    for (const mint of mints) {
      const tick = ticksMap.get(mint);
      prices[mint] = tick?.priceUsd || 0;
    }

    return prices;
  }

  getSolPrice(): number {
    return this.solPriceUsd;
  }

  onPriceUpdate(callback: (tick: PriceTick) => void): () => void {
    this.on("price", callback);
    return () => {
      this.off("price", callback);
    };
  }

  subscribe(callback: (tick: PriceTick) => void): () => void {
    return this.onPriceUpdate(callback);
  }

  getStats() {
    return {
      solPrice: this.solPriceUsd,
      cachedPrices: this.priceCache.size,
      priceSubscribers: this.listenerCount('price'),
      wsConnected: this.ws?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      plan: "Developer (optimized)",
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

  async stop() {
    logger.info("Stopping price service");

    this.shouldReconnect = false;

    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals = [];

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.removeAllListeners();
  }
}

// Export singleton instance
const optimizedPriceService = new OptimizedPriceService();
export default optimizedPriceService;
