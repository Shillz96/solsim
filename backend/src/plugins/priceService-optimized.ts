/**
 * Optimized Price Service - PumpPortal-Only Architecture
 *
 * ARCHITECTURE DECISION (Oct 26, 2025):
 * ========================================
 * We've simplified from dual WebSocket (Helius + PumpPortal) to PumpPortal-only.
 * 
 * WHY?
 * - PumpPortal supports ALL Solana tokens (not just pump.fun!)
 * - Pool types: "pump", "raydium", "bonk", "launchlab", "pump-amm", "raydium-cpmm", "auto"
 * - "auto" pool detection handles ANY Solana token automatically
 * - Simpler architecture: 1 WebSocket instead of 2
 * - No race conditions between dual sources
 * - ~200 fewer lines of WebSocket management code
 * 
 * WHAT WAS DISABLED:
 * - Helius Standard WebSocket (logsSubscribe for DEX programs)
 * - Code preserved in comments below for easy rollback if needed
 * 
 * See: backend/WEBSOCKET_ARCHITECTURE_DECISION.md for full details
 *
 * Key features:
 * - PumpPortal WebSocket for real-time prices (ALL tokens)
 * - Aggressive multi-layer caching to minimize API calls
 * - Stale-while-revalidate pattern for better UX
 * - Circuit breakers to prevent credit waste on failing APIs
 * - Smart batching to respect rate limits
 */

import { EventEmitter } from "events";
import WebSocket from "ws";
import redis from "./redis.js";
import { loggers } from "../utils/logger.js";
import { pumpPortalStreamService, SwapEvent } from "../services/pumpPortalStreamService.js";

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

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  get size(): number {
    return this.cache.size;
  }

  forEach(callback: (value: V, key: K) => void): void {
    this.cache.forEach((value, key) => callback(value, key));
  }

  clear(): void {
    this.cache.clear();
  }
}

// Negative cache entry (for tokens that don't exist)
interface NegativeCacheEntry {
  timestamp: number;
  reason: string; // '404', '204', 'no-data', etc.
}

// Circuit breaker for external API calls (improved to handle expected failures)
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = 5;
  private readonly timeout = 60000;
  private readonly name: string;

  constructor(name: string = 'unknown') {
    this.name = name;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.info({ breaker: this.name }, 'Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logger.info({ breaker: this.name }, 'Circuit breaker returned to CLOSED state');
      }
      return result;
    } catch (error: any) {
      // Don't count expected "not found" responses or timeouts as failures
      const isExpectedFailure =
        error.message?.includes('404') ||
        error.message?.includes('204') ||
        error.message?.includes('No Content') ||
        error.message?.includes('Not Found') ||
        error.message?.includes('Token not found') ||
        error.message?.includes('aborted') ||        // AbortController timeout
        error.message?.includes('fetch failed') ||    // Generic fetch failure (often timeout)
        error.name === 'AbortError';                  // AbortController error type

      if (isExpectedFailure) {
        logger.debug({ breaker: this.name, error: error.message, type: error.name }, 'Expected failure - not counting toward circuit breaker');
        throw error;
      }

      // Count only unexpected failures (network errors, 500s, etc.)
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        logger.error({ breaker: this.name, error: error.message }, 'Circuit breaker opened after 5 unexpected failures');
      }
      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    logger.info({ breaker: this.name }, 'Circuit breaker manually reset');
  }
}

/**
 * Optimized Price Service using Standard WebSockets (free on Developer plan!)
 */
class OptimizedPriceService extends EventEmitter {
  private priceCache = new LRUCache<string, PriceTick>(5000); // Increased from 2000 to 5000 for better hit rate
  private negativeCache = new LRUCache<string, NegativeCacheEntry>(2000); // Cache for tokens that don't exist
  private solPriceUsd = 200; // Default to $200 - will be updated on first price fetch
  private lastSolPriceUpdate = 0; // Timestamp of last SOL price update
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private updateIntervals: NodeJS.Timeout[] = [];
  // DexScreener disabled to prevent rate limit issues
  // private dexScreenerBreaker = new CircuitBreaker('DexScreener');
  private jupiterBreaker = new CircuitBreaker('Jupiter');

  // Request coalescing to prevent duplicate concurrent requests
  private pendingRequests = new Map<string, Promise<PriceTick | null>>();

  // WebSocket reconnection
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private reconnectDelay = 1000;
  private readonly MAX_RECONNECT_DELAY = 60000;
  private isReconnecting = false;
  private shouldReconnect = true;

  // Rate limiting for swap-triggered refreshes
  private lastRefreshTime = new Map<string, number>(); // Track last refresh per token
  private readonly MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refreshes per token
  private refreshQueue = new Set<string>(); // Tokens queued for refresh
  private isProcessingQueue = false;

  // Health check monitoring
  private lastPriceUpdate = Date.now(); // Track last time ANY price was updated (WebSocket or API)
  // private lastHeliusWsMessage = Date.now(); // DISABLED - Helius WebSocket not in use
  private lastPumpPortalWsMessage = Date.now(); // Track last PumpPortal WebSocket message

  // HELIUS WEBSOCKET - DISABLED (Code preserved for rollback)
  // ============================================================
  // Disabled because PumpPortal supports ALL Solana tokens via pool="auto"
  // Including: Raydium, Orca, pump.fun, bonk.fun, LaunchLab, etc.
  // See: backend/WEBSOCKET_ARCHITECTURE_DECISION.md
  //
  // DEX programs to monitor via WebSocket (Standard API - FREE!)
  // private readonly DEX_PROGRAMS = [
  //   "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium V4 (most active)
  //   "CAMMCzo5YL8w4VFF8KVHrK22GGUQpMpTFb6xRmpLFGNnSm", // Raydium CLMM
  //   "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",  // Pump.fun
  // ];
  // private readonly HELIUS_WS_URL: string;
  // ============================================================

  constructor() {
    super();

    // Fix EventEmitter memory leak warning
    this.setMaxListeners(200); // Increased from 100 to prevent memory leak warnings

    // HELIUS WEBSOCKET DISABLED - API key check removed
    // const apiKey = process.env.HELIUS_API;
    // if (!apiKey) {
    //   throw new Error("HELIUS_API environment variable is required");
    // }
    // this.HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${apiKey}`;

    logger.info("Initializing Optimized Price Service (PumpPortal-Only)");
  }

  async start() {
    logger.info("Starting Optimized Price Service (PumpPortal-Only Architecture)");

    // Get initial SOL price (critical for trades)
    await this.updateSolPrice();

    // Set up frequent SOL price updates (every 5 seconds for real-time trading)
    const solInterval = setInterval(() => this.updateSolPrice(), 5000);
    this.updateIntervals.push(solInterval);

    // HELIUS WEBSOCKET DISABLED - PumpPortal covers ALL Solana tokens
    // await this.connectWebSocket();

    // Start PumpPortal stream service (shared singleton)
    if (!pumpPortalStreamService.isConnected) {
      await pumpPortalStreamService.start();
      logger.info("✅ PumpPortal stream service started");
    }

    // Listen to swap events from PumpPortal for price calculations
    pumpPortalStreamService.on('swap', async (event: SwapEvent) => {
      try {
        // Skip if missing required data
        if (!event.solAmount || !event.tokenAmount) {
          return;
        }

        // Calculate USD price from swap event
        const priceUsd = (event.solAmount / event.tokenAmount) * this.solPriceUsd;

        if (priceUsd > 0) {
          const tick: PriceTick = {
            mint: event.mint,
            priceUsd,
            priceSol: event.solAmount / event.tokenAmount,
            solUsd: this.solPriceUsd,
            timestamp: event.timestamp,
            source: 'pumpportal-ws'
          };

          // CRITICAL: Log swap event reception to verify PumpPortal is sending data
          logger.info({
            mint: event.mint.slice(0, 8),
            priceUsd: priceUsd.toFixed(8),
            priceSol: (tick.priceSol || 0).toFixed(10),
            txType: event.txType
          }, "[PumpPortal] 📊 Swap event received, updating price cache");

          await this.updatePrice(tick);
        }
      } catch (error) {
        logger.error({ error, mint: event.mint }, "Failed to process swap event");
      }
    });

    logger.info("✅ Price service started - listening to PumpPortal swap events");
  }

  // HELIUS WEBSOCKET - DISABLED (Code preserved for rollback)
  // ============================================================
  // These methods are disabled because PumpPortal supports ALL Solana tokens
  // via their "pool": "auto" parameter. No need for dual WebSocket system.
  // See: backend/WEBSOCKET_ARCHITECTURE_DECISION.md
  // To re-enable: Uncomment this code and the call in start() method
  //
  /*
  private async connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.warn("WebSocket already connected");
      return;
    }

    try {
      logger.info("🔌 Connecting to Helius Standard WebSocket...");
      const apiKey = process.env.HELIUS_API;
      const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${apiKey}`;
      this.ws = new WebSocket(HELIUS_WS_URL);

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

    const DEX_PROGRAMS = [
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium V4
      "CAMMCzo5YL8w4VFF8KVHrK22GGUQpMpTFb6xRmpLFGNnSm", // Raydium CLMM
      "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",  // Pump.fun
    ];

    // Subscribe to each DEX program using logsSubscribe (Standard API)
    DEX_PROGRAMS.forEach((programId, index) => {
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

    logger.info({ programs: DEX_PROGRAMS.length }, "📡 Subscribed to DEX programs via logsSubscribe");
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
  */
  // ============================================================
  // END HELIUS WEBSOCKET CODE

  private handleWebSocketMessage(data: WebSocket.Data) {
    try {
      const messageStr = data.toString('utf8');
      const message = JSON.parse(messageStr);

      // HELIUS WEBSOCKET DISABLED - This method is no longer called
      // Update health check timestamp
      // this.lastHeliusWsMessage = Date.now();

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

      // Parse logs for swap activity
      const swapSignal = this.detectSwapActivity(logs);

      if (swapSignal.isSwap) {
        logger.debug({
          signature: signature?.slice(0, 16),
          dex: swapSignal.dex
        }, "Swap detected - triggering price refresh");

        // Use swap as a signal to refresh prices for involved tokens
        // This gives us near-instant price updates (1-2s latency)
        if (swapSignal.involvedTokens.length > 0) {
          this.triggerPriceRefresh(swapSignal.involvedTokens);
        }
      }

    } catch (error) {
      logger.error({ error }, "Failed to process log notification");
    }
  }

  /**
   * Detect swap activity from transaction logs
   * Returns signals indicating a swap occurred and which DEX
   */
  private detectSwapActivity(logs: string[]): {
    isSwap: boolean;
    dex: string | null;
    involvedTokens: string[];
  } {
    let isSwap = false;
    let dex: string | null = null;
    const involvedTokens: string[] = [];

    for (const log of logs) {
      // Raydium swap detection
      if (log.includes('ray_log:')) {
        isSwap = true;
        dex = 'Raydium';

        // Try to parse Raydium ray_log for swap amounts
        const rayLogMatch = log.match(/ray_log:\s*([A-Za-z0-9+/=]+)/);
        if (rayLogMatch) {
          try {
            const rayLogData = Buffer.from(rayLogMatch[1], 'base64');
            // Raydium ray_log structure: [type:u8, amountIn:u64, amountOut:u64, ...]
            if (rayLogData.length >= 17) {
              const amountIn = rayLogData.readBigUInt64LE(1);
              const amountOut = rayLogData.readBigUInt64LE(9);

              logger.debug({
                amountIn: amountIn.toString(),
                amountOut: amountOut.toString()
              }, "Raydium swap amounts");
            }
          } catch (err) {
            // Parsing failed, but we still know a swap occurred
            logger.debug({ error: err }, "Failed to parse ray_log details");
          }
        }
      }

      // Pump.fun swap detection
      if (log.includes('Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')) {
        if (log.includes('invoke') || log.includes('success')) {
          isSwap = true;
          dex = 'Pump.fun';
        }
      }

      // Generic swap indicators (works for Orca, Jupiter, etc.)
      if (log.includes('Instruction: Swap') ||
          log.includes('Instruction: SwapBaseIn') ||
          log.includes('Instruction: SwapBaseOut')) {
        isSwap = true;
        if (!dex) dex = 'Unknown DEX';
      }

      // Extract token mint addresses from logs
      // SPL Token Transfer logs include mint addresses
      const mintMatch = log.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/g);
      if (mintMatch) {
        mintMatch.forEach(address => {
          // Filter out common non-token addresses
          if (address.length >= 32 &&
              !address.startsWith('11111') && // System program
              !address.startsWith('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') && // Token program
              !involvedTokens.includes(address)) {
            involvedTokens.push(address);
          }
        });
      }
    }

    return { isSwap, dex, involvedTokens };
  }

  /**
   * Trigger immediate price refresh for tokens involved in a swap
   * This is called when we detect real-time swap activity
   *
   * CRITICAL: Rate-limited to prevent DexScreener/Jupiter 429 errors
   */
  private triggerPriceRefresh(tokenAddresses: string[]) {
    // Known quote tokens - we don't need to refresh their prices
    const quoteTokens = new Set([
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'  // USDT
    ]);

    // Filter to only target tokens (non-quote tokens)
    const targetTokens = tokenAddresses.filter(addr => !quoteTokens.has(addr));

    if (targetTokens.length === 0) {
      return; // Only quote tokens involved
    }

    const now = Date.now();

    // Add tokens to queue with rate limiting
    for (const mint of targetTokens) {
      const lastRefresh = this.lastRefreshTime.get(mint) || 0;
      const timeSinceRefresh = now - lastRefresh;

      // Skip if refreshed recently (within MIN_REFRESH_INTERVAL)
      if (timeSinceRefresh < this.MIN_REFRESH_INTERVAL) {
        logger.debug({
          mint: mint.slice(0, 8),
          timeSinceRefresh: Math.round(timeSinceRefresh / 1000)
        }, "Skipping swap-triggered refresh (too recent)");
        continue;
      }

      // Add to queue for processing
      this.refreshQueue.add(mint);
    }

    // Process queue with rate limiting
    this.processRefreshQueue();
  }

  /**
   * Process refresh queue with strict rate limiting
   * Processes 1 token per second to respect API rate limits
   */
  private async processRefreshQueue() {
    // Prevent concurrent queue processing
    if (this.isProcessingQueue || this.refreshQueue.size === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const tokensToProcess = Array.from(this.refreshQueue).slice(0, 1); // Process 1 at a time

      for (const mint of tokensToProcess) {
        this.refreshQueue.delete(mint);
        this.lastRefreshTime.set(mint, Date.now());

        logger.debug({
          mint: mint.slice(0, 8),
          queueRemaining: this.refreshQueue.size
        }, "Processing swap-triggered refresh");

        try {
          const tick = await this.fetchTokenPrice(mint);
          if (tick) {
            await this.updatePrice(tick);
            logger.info({
              mint: mint.slice(0, 8),
              price: tick.priceUsd.toFixed(6),
              source: tick.source
            }, "Price refreshed from swap signal");
          }
        } catch (err) {
          logger.debug({ mint: mint.slice(0, 8), error: err }, "Swap-triggered refresh failed");
        }

        // Wait 1 second between refreshes to respect rate limits
        if (this.refreshQueue.size > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Continue processing if queue has more items
      if (this.refreshQueue.size > 0) {
        setTimeout(() => {
          this.isProcessingQueue = false;
          this.processRefreshQueue();
        }, 1000);
      } else {
        this.isProcessingQueue = false;
      }

    } catch (error) {
      logger.error({ error }, "Error processing refresh queue");
      this.isProcessingQueue = false;
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
        // HELIUS WEBSOCKET DISABLED - reconnection not needed
        // await this.connectWebSocket();
      } catch (error) {
        logger.error({ error }, "Reconnection failed");
      }

      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.MAX_RECONNECT_DELAY);
      this.isReconnecting = false;
    }, this.reconnectDelay);
  }

  private async updateSolPrice() {
    try {
      // Try CoinGecko first
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
        { 
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent': 'VirtualSol/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.solana?.usd) {
        const newPrice = data.solana.usd;
        const oldPrice = this.solPriceUsd;

        // Validate price is within reasonable range
        if (newPrice < 50 || newPrice > 500) {
          logger.error({
            newPrice,
            oldPrice,
            source: 'coingecko',
            rawData: data
          }, "INVALID SOL price from CoinGecko - rejecting update");
          throw new Error(`Invalid SOL price: ${newPrice} (must be between $50-$500)`);
        }

        this.solPriceUsd = newPrice;
        this.lastSolPriceUpdate = Date.now();

        logger.info({ oldPrice, newPrice: this.solPriceUsd }, "SOL price updated from CoinGecko");

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
        return;
      }
    } catch (error) {
      logger.warn({ error }, "CoinGecko SOL price fetch failed, trying fallback");
    }

    // Fallback to Jupiter API
    try {
      const response = await fetch(
        "https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112",
        { 
          signal: AbortSignal.timeout(5000),
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'VirtualSol/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data['So11111111111111111111111111111111111111112']?.price) {
          const newPrice = parseFloat(data.data['So11111111111111111111111111111111111111112'].price);
          const oldPrice = this.solPriceUsd;

          // Validate price is within reasonable range
          if (newPrice < 50 || newPrice > 500) {
            logger.error({
              newPrice,
              oldPrice,
              source: 'jupiter',
              rawData: data
            }, "INVALID SOL price from Jupiter - rejecting update");
            throw new Error(`Invalid SOL price: ${newPrice} (must be between $50-$500)`);
          }

          this.solPriceUsd = newPrice;
          this.lastSolPriceUpdate = Date.now();

          logger.info({ oldPrice, newPrice: this.solPriceUsd }, "SOL price updated from Jupiter fallback");

          const solTick: PriceTick = {
            mint: "So11111111111111111111111111111111111111112",
            priceUsd: this.solPriceUsd,
            priceSol: 1,
            solUsd: this.solPriceUsd,
            timestamp: Date.now(),
            source: "jupiter-fallback"
          };

          await this.updatePrice(solTick);
          return;
        }
      }
    } catch (error) {
      logger.warn({ error }, "Jupiter SOL price fallback failed");
    }

    // Final fallback: use cached price or default
    if (this.solPriceUsd <= 0) {
      this.solPriceUsd = 200; // Default SOL price if all sources fail
      logger.warn({ fallbackPrice: this.solPriceUsd }, "Using fallback SOL price");
    } else {
      logger.warn({ currentPrice: this.solPriceUsd }, "Could not fetch SOL price, using fallback");
    }
  }


  /**
   * Subscribe to real-time price updates for a specific token via PumpPortal
   * Called when frontend WebSocket client subscribes to a token
   */
  public subscribeToPumpPortalToken(mint: string) {
    if (!pumpPortalStreamService.isConnected) {
      logger.warn({ mint }, "❌ Cannot subscribe - PumpPortal WebSocket not connected");
      return;
    }

    logger.info({ mint: mint.slice(0, 8) }, "📡 Subscribing to PumpPortal token trades...");
    pumpPortalStreamService.subscribeToTokens([mint]);
    logger.info({ mint: mint.slice(0, 8) }, "✅ Subscription request sent to PumpPortal");
  }

  /**
   * Unsubscribe from real-time price updates for a specific token
   * Called when frontend WebSocket client unsubscribes from a token
   *
   * NOTE: PumpPortal doesn't support unsubscribing from individual tokens.
   * Subscriptions remain active for the lifetime of the WebSocket connection.
   * This is a no-op to maintain API compatibility.
   */
  public unsubscribeFromPumpPortalToken(mint: string) {
    // PumpPortal WebSocket API doesn't support unsubscribing from individual tokens
    // Subscriptions remain active until connection closes
    logger.debug({ mint: mint.slice(0, 8) }, "Unsubscribe requested (PumpPortal doesn't support individual unsubscribe)");
  }

  /**
   * Clear negative cache entry for a specific token
   * Used when we need to force a fresh price fetch (e.g., SELL orders for owned tokens)
   */
  public clearNegativeCache(mint: string): void {
    const wasInCache = this.negativeCache.has(mint);
    if (wasInCache) {
      this.negativeCache.delete(mint);
      logger.debug({ mint: mint.slice(0, 8) }, "Cleared negative cache entry");
    }
  }


  /**
   * Get negative cache TTL
   * Use shorter TTL since tokens can gain liquidity quickly
   */
  private getNegativeCacheTTL(mint: string): number {
    return 2 * 60 * 1000;  // 2 minutes for all tokens
  }


  /**
   * Batch fetch token prices - DexScreener disabled to prevent rate limit issues
   * Using only PumpPortal and Jupiter as fallback
   */
  async fetchTokenPricesBatch(mints: string[]): Promise<Map<string, PriceTick>> {
    const result = new Map<string, PriceTick>();

    if (mints.length === 0) return result;

    logger.debug({ requested: mints.length }, "DexScreener batch disabled - using individual fetches");
    
    // Fall back to individual price fetches using PumpPortal and Jupiter
    for (const mint of mints) {
      try {
        const price = await this.fetchTokenPrice(mint);
        if (price) {
          result.set(mint, price);
        }
      } catch (error) {
        // Silent fail for individual tokens
        logger.debug({ mint: mint.slice(0, 8) }, "Individual price fetch failed");
      }
    }

    logger.info({ requested: mints.length, found: result.size }, "Batch price fetch completed (DexScreener disabled)");
    return result;
  }

  async fetchTokenPrice(mint: string): Promise<PriceTick | null> {
    // Check negative cache first (tokens we know don't exist)
    const negativeCacheEntry = this.negativeCache.get(mint);
    if (negativeCacheEntry) {
      const age = Date.now() - negativeCacheEntry.timestamp;
      // Dynamic TTL: 2 minutes for pump.fun tokens, 10 minutes for others
      const NEGATIVE_CACHE_TTL = this.getNegativeCacheTTL(mint);

      if (age < NEGATIVE_CACHE_TTL) {
        // Token is in negative cache - don't log, just return null
        return null;
      } else {
        // Expired, will try again
        this.negativeCache.set(mint, { timestamp: 0, reason: '' });
      }
    }

    // Request coalescing - check if already fetching this token
    const pending = this.pendingRequests.get(mint);
    if (pending) {
      // Coalescing - don't log to reduce noise
      return pending;
    }

    // Create promise and store in pending map
    const fetchPromise = this._fetchTokenPriceInternal(mint);
    this.pendingRequests.set(mint, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(mint);
    }
  }

  private async _fetchTokenPriceInternal(mint: string): Promise<PriceTick | null> {
    // For initial price fetch, use Jupiter as primary fallback
    // Real-time updates come from PumpPortal WebSocket (swap events)
    // DexScreener and pump.fun frontend API disabled (unreliable/rate-limited)

    logger.debug({ mint: mint.slice(0, 8) }, "Fetching price from Jupiter");

    // Try Jupiter fallback (increased timeout for reliability during trades)
    try {
      const jupResult = await this.jupiterBreaker.execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased from 8s to 15s

        try {
          logger.debug({ mint: mint.slice(0, 8) }, "[Jupiter] Starting API request");
          const response = await fetch(
            `https://lite-api.jup.ag/price/v3?ids=${mint}`,
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
            logger.warn({ mint: mint.slice(0, 8), status: response.status }, "[Jupiter] Non-OK response");
            if (response.status === 204) {
              // Add to negative cache immediately
              this.negativeCache.set(mint, { timestamp: Date.now(), reason: '204-no-content' });
              return null;
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          // Jupiter API v3 format: { "MINT": { "usdPrice": 0.002, "blockId": 123, ... } }
          if (data[mint] && data[mint].usdPrice) {
            const priceUsd = parseFloat(data[mint].usdPrice);
            if (priceUsd > 0) {
              logger.info({ mint: mint.slice(0, 8), priceUsd }, "[Jupiter] ✅ Price fetched successfully");
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
          logger.warn({ mint: mint.slice(0, 8), data }, "[Jupiter] No price in response data");
          return null;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      });

      if (jupResult) return jupResult;
    } catch (error: any) {
      // Log all errors during price fetching for debugging trades
      const isExpectedError =
        error.message === 'Circuit breaker is OPEN' ||
        error.message?.includes('204') ||
        error.message?.includes('aborted') ||
        error.message?.includes('fetch failed') ||
        error.name === 'AbortError';

      // Always log during trades to diagnose price fetch failures
      logger.warn({
        mint: mint.slice(0, 8),
        error: error.message,
        errorName: error.name,
        isExpectedError
      }, "[Jupiter] API error during price fetch");
    }

    // For non-pump.fun tokens, try pump.fun as last resort
    // (some tokens might be on pump.fun but don't have "pump" suffix)
    // No price found from any source - add to negative cache
    this.negativeCache.set(mint, {
      timestamp: Date.now(),
      reason: 'not-found-all-sources'
    });

    return null;
  }

  private async updatePrice(tick: PriceTick) {
    this.priceCache.set(tick.mint, tick);

    // Update health check timestamp whenever we update ANY price
    this.lastPriceUpdate = Date.now();

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
      // Use batch fetching if we have multiple tokens (much more efficient!)
      if (stillToFetch.length >= 3) {
        logger.debug({ count: stillToFetch.length }, "Using batch fetch for multiple tokens");

        try {
          const batchResults = await this.fetchTokenPricesBatch(stillToFetch);

          for (const [mint, tick] of batchResults.entries()) {
            await this.updatePrice(tick);
            result.set(mint, tick);
          }

          // For tokens not found in batch, add to negative cache
          for (const mint of stillToFetch) {
            if (!batchResults.has(mint)) {
              this.negativeCache.set(mint, {
                timestamp: Date.now(),
                reason: 'batch-not-found'
              });
            }
          }
        } catch (error) {
          logger.warn({ count: stillToFetch.length, error }, "Batch fetch failed, falling back to individual");

          // Fallback to individual fetching
          for (const mint of stillToFetch) {
            try {
              const tick = await this.fetchTokenPrice(mint);
              if (tick) {
                await this.updatePrice(tick);
                result.set(mint, tick);
              }
            } catch (err) {
              logger.debug({ mint, error: err }, "Individual fetch failed in fallback");
            }
          }
        }
      } else {
        // For small batches (< 3 tokens), use individual fetching
        for (const mint of stillToFetch) {
          try {
            const tick = await this.fetchTokenPrice(mint);
            if (tick) {
              await this.updatePrice(tick);
              result.set(mint, tick);
            }
          } catch (err) {
            logger.debug({ mint, error: err }, "Individual fetch failed");
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
      logger.info({ mint: mint.slice(0, 8) }, "💭 No cached price found, fetching from Jupiter...");
      tick = await this.fetchTokenPrice(mint);
      if (tick) {
        await this.updatePrice(tick);
        logger.info({
          mint: mint.slice(0, 8),
          price: tick.priceUsd.toFixed(8),
          source: tick.source
        }, "✅ Price fetched and cached");
      } else {
        logger.warn({ mint: mint.slice(0, 8) }, "❌ Failed to fetch price from Jupiter");
      }
    } else {
      const age = Date.now() - tick.timestamp;
      logger.info({
        mint: mint.slice(0, 8),
        price: tick.priceUsd.toFixed(8),
        ageSeconds: (age / 1000).toFixed(1),
        source: tick.source
      }, "🎯 Using cached price");
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
    // Warn if SOL price is stale (older than 5 minutes)
    const now = Date.now();
    const PRICE_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    if (this.lastSolPriceUpdate === 0) {
      logger.warn({ price: this.solPriceUsd }, 'SOL price has never been updated - using default');
    } else if (now - this.lastSolPriceUpdate > PRICE_STALE_THRESHOLD) {
      logger.warn({
        price: this.solPriceUsd,
        staleSince: Math.floor((now - this.lastSolPriceUpdate) / 1000) + 's ago'
      }, 'SOL price is stale');
    }

    return this.solPriceUsd;
  }

  getSolPriceAge(): number {
    if (this.lastSolPriceUpdate === 0) return Infinity;
    return Date.now() - this.lastSolPriceUpdate;
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
    const now = Date.now();
    // const heliusWsAge = now - this.lastHeliusWsMessage; // HELIUS WEBSOCKET DISABLED
    const pumpPortalWsAge = now - this.lastPumpPortalWsMessage;
    const lastPriceAge = now - this.lastPriceUpdate;

    return {
      solPrice: this.solPriceUsd,
      cachedPrices: this.priceCache.size,
      negativeCached: this.negativeCache.size,
      pendingRequests: this.pendingRequests.size,
      priceSubscribers: this.listenerCount('price'),
      wsConnected: this.ws?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      circuitBreakers: {
        dexscreener: 'DISABLED', // DexScreener disabled to prevent rate limits
        jupiter: this.jupiterBreaker.getState()
      },
      // Health check metrics
      health: {
        lastPriceUpdateAgo: lastPriceAge,
        // lastHeliusWsMessageAgo: heliusWsAge,  // HELIUS WEBSOCKET DISABLED
        lastPumpPortalWsMessageAgo: pumpPortalWsAge,
        // heliusWsStale: heliusWsAge > 60000,    // HELIUS WEBSOCKET DISABLED
        pumpPortalWsStale: pumpPortalWsAge > 60000, // > 1 minute
        priceUpdatesStale: lastPriceAge > 30000, // > 30 seconds
        isHealthy: lastPriceAge < 60000 && pumpPortalStreamService.isConnected
      },
      pumpPortal: {
        connected: pumpPortalStreamService.isConnected,
        subscribedTokens: pumpPortalStreamService.getSubscribedTokenCount(),
        subscribedWallets: pumpPortalStreamService.getSubscribedWalletCount()
      },
      plan: "PumpPortal-Only (simplified v3)",
      lastUpdate: now
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

    // Stop all update intervals
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals = [];

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Stop PumpPortal stream service (graceful shutdown)
    if (pumpPortalStreamService.isConnected) {
      await pumpPortalStreamService.stop();
      logger.info("✅ PumpPortal stream service stopped");
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
