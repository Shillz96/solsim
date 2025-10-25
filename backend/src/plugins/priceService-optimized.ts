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
import { PumpPortalWebSocketClient, PumpFunPrice } from "./pumpPortalWs.js";

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
  private solPriceUsd = 100;
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private updateIntervals: NodeJS.Timeout[] = [];
  // DexScreener disabled to prevent rate limit issues
  // private dexScreenerBreaker = new CircuitBreaker('DexScreener');
  private jupiterBreaker = new CircuitBreaker('Jupiter');

  // Request coalescing to prevent duplicate concurrent requests
  private pendingRequests = new Map<string, Promise<PriceTick | null>>();

  // PumpPortal WebSocket for real-time pump.fun prices
  private pumpPortalWs: PumpPortalWebSocketClient | null = null;

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
  private lastHeliusWsMessage = Date.now(); // Track last Helius WebSocket message
  private lastPumpPortalWsMessage = Date.now(); // Track last PumpPortal WebSocket message

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
    logger.info("Starting Optimized Price Service with pump.fun integration");

    // Get initial SOL price
    await this.updateSolPrice();

    // Set up regular SOL price updates (every 30s)
    const solInterval = setInterval(() => this.updateSolPrice(), 30000);
    this.updateIntervals.push(solInterval);

    // Connect to Helius Standard WebSocket (no credit cost!)
    await this.connectWebSocket();

    // Connect to PumpPortal WebSocket for real-time pump.fun prices
    await this.connectPumpPortalWebSocket();

    logger.info("✅ Price service started with multi-source streaming (Helius + PumpPortal)");
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

      // Update health check timestamp
      this.lastHeliusWsMessage = Date.now();

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
        const oldPrice = this.solPriceUsd;
        this.solPriceUsd = data.solana.usd;

        logger.info({ oldPrice, newPrice: this.solPriceUsd }, "SOL price updated");

        // Update PumpPortal WebSocket with new SOL price
        if (this.pumpPortalWs) {
          this.pumpPortalWs.updateSolPrice(this.solPriceUsd);
        }

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
        "https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112",
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
          const oldPrice = this.solPriceUsd;
          this.solPriceUsd = parseFloat(data.data['So11111111111111111111111111111111111111112'].price);

          logger.info({ oldPrice, newPrice: this.solPriceUsd }, "SOL price updated from Jupiter fallback");

          // Update PumpPortal WebSocket with new SOL price
          if (this.pumpPortalWs) {
            this.pumpPortalWs.updateSolPrice(this.solPriceUsd);
          }

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
   * Connect to PumpPortal WebSocket for real-time pump.fun price streaming
   */
  private async connectPumpPortalWebSocket() {
    try {
      logger.info("🔌 Initializing PumpPortal WebSocket client...");
      this.pumpPortalWs = new PumpPortalWebSocketClient(this.solPriceUsd);

      // Listen for price updates from PumpPortal
      this.pumpPortalWs.on('price', async (pumpPrice: PumpFunPrice) => {
        // Update health check timestamp
        this.lastPumpPortalWsMessage = Date.now();

        const tick: PriceTick = {
          mint: pumpPrice.mint,
          priceUsd: pumpPrice.priceUsd,
          priceSol: pumpPrice.priceSol,
          solUsd: this.solPriceUsd,
          timestamp: pumpPrice.timestamp,
          source: pumpPrice.source,
          marketCapUsd: pumpPrice.marketCapUsd
        };

        await this.updatePrice(tick);
      });

      logger.info("🔌 Connecting to PumpPortal WebSocket (wss://pumpportal.fun/api/data)...");
      await this.pumpPortalWs.connect();

      // Subscribe to new token creation events (to catch brand new memecoins)
      logger.info("📡 Subscribing to PumpPortal new token events...");
      this.pumpPortalWs.subscribeToNewTokens();

      logger.info("✅ PumpPortal WebSocket connected and subscribed for real-time pump.fun prices");
    } catch (error) {
      logger.error({ 
        error, 
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, "❌ Failed to connect to PumpPortal WebSocket - pump.fun real-time prices will not be available");
      // Don't throw - allow the service to continue without PumpPortal
    }
  }

  /**
   * Subscribe to real-time price updates for a specific token
   * Used by portfolio service to get real-time updates
   */
  public subscribeToPumpFunToken(mint: string) {
    if (!this.pumpPortalWs || !this.pumpPortalWs.isConnected()) {
      logger.warn({ mint }, "Cannot subscribe - PumpPortal WebSocket not connected");
      return;
    }

    if (this.isPumpFunToken(mint)) {
      this.pumpPortalWs.subscribeToToken(mint);
      logger.debug({ mint: mint.slice(0, 8) }, "Subscribed to pump.fun token real-time updates");
    }
  }

  /**
   * Unsubscribe from real-time price updates for a specific token
   */
  public unsubscribeFromPumpFunToken(mint: string) {
    if (!this.pumpPortalWs || !this.pumpPortalWs.isConnected()) {
      return;
    }

    if (this.isPumpFunToken(mint)) {
      this.pumpPortalWs.unsubscribeFromToken(mint);
      logger.debug({ mint: mint.slice(0, 8) }, "Unsubscribed from pump.fun token updates");
    }
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
   * Detect if a token is likely a pump.fun token
   * Heuristic: pump.fun tokens typically end with "pump"
   */
  private isPumpFunToken(mint: string): boolean {
    return mint.endsWith('pump');
  }

  /**
   * Get dynamic negative cache TTL based on token type
   * - Pump.fun tokens: 2 minutes (can gain liquidity quickly)
   * - Other tokens: 10 minutes (established tokens won't appear suddenly)
   */
  private getNegativeCacheTTL(mint: string): number {
    return this.isPumpFunToken(mint)
      ? 2 * 60 * 1000  // 2 minutes for pump.fun tokens
      : 10 * 60 * 1000; // 10 minutes for other tokens
  }

  /**
   * Fetch price from pump.fun API
   * Used as PRIMARY source for pump.fun tokens, LAST RESORT for others
   * Includes retry logic for transient failures
   */
  private async fetchPumpFunPrice(mint: string, retryCount: number = 0): Promise<PriceTick | null> {
    const MAX_RETRIES = 1; // Try twice total (initial + 1 retry)

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout (more reliable for pump.fun API)

      const response = await fetch(
        `https://frontend-api.pump.fun/coins/${mint}`,
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
        if (response.status === 404) {
          // Token doesn't exist on pump.fun - don't retry
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Calculate price from bonding curve reserves
      if (data && data.virtual_sol_reserves && data.virtual_token_reserves) {
        const virtualSolReserves = data.virtual_sol_reserves / 1e9; // lamports → SOL
        const virtualTokenReserves = data.virtual_token_reserves / 1e6; // Assuming 6 decimals
        const tokenPriceInSol = virtualSolReserves / virtualTokenReserves;
        const tokenPriceInUsd = tokenPriceInSol * this.solPriceUsd;

        if (tokenPriceInUsd > 0) {
          return {
            mint,
            priceUsd: tokenPriceInUsd,
            priceSol: tokenPriceInSol,
            solUsd: this.solPriceUsd,
            timestamp: Date.now(),
            source: "pumpfun",
            marketCapUsd: data.usd_market_cap
          };
        }
      }

      return null;
    } catch (error: any) {
      // Check if this is a transient error that should be retried
      const isTransientError =
        error.message?.includes('aborted') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('ENOTFOUND') ||
        error.name === 'AbortError';

      // Retry logic for transient errors
      if (isTransientError && retryCount < MAX_RETRIES) {
        logger.debug({ mint: mint.slice(0, 8), retryCount: retryCount + 1 }, "Retrying pump.fun API call");
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay before retry
        return this.fetchPumpFunPrice(mint, retryCount + 1);
      }

      // Don't log expected failures (404, timeouts, fetch errors)
      const isExpectedError =
        error.message?.includes('404') ||
        isTransientError;

      if (!isExpectedError) {
        // Only log truly unexpected errors with more context
        logger.debug({
          mint: mint.slice(0, 8),
          error: error.message,
          statusCode: error.statusCode || 'unknown',
          retryCount
        }, "PumpFun API unexpected error");
      }

      return null;
    }
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
    // SMART ROUTING: Check if it's a pump.fun token and route accordingly
    if (this.isPumpFunToken(mint)) {
      // For pump.fun tokens, try pump.fun API FIRST (fastest & most accurate)
      const pumpPrice = await this.fetchPumpFunPrice(mint);
      if (pumpPrice) {
        await this.updatePrice(pumpPrice);
        return pumpPrice;
      }
      // If not found on pump.fun, it might have graduated to Raydium
      // Fall through to try DexScreener/Jupiter
    }

    // DexScreener disabled to prevent rate limit issues
    // Using only PumpPortal and Jupiter as fallback
    logger.debug({ mint: mint.slice(0, 8) }, "Skipping DexScreener to avoid rate limits");

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
            if (response.status === 204) {
              // Add to negative cache immediately
              this.negativeCache.set(mint, { timestamp: Date.now(), reason: '204-no-content' });
              return null;
            }
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
      // Only log unexpected errors - reduces log spam by 95%
      const isExpectedError =
        error.message === 'Circuit breaker is OPEN' ||
        error.message?.includes('204') ||
        error.message?.includes('aborted') ||
        error.message?.includes('fetch failed') ||
        error.name === 'AbortError';

      if (!isExpectedError) {
        logger.warn({ mint: mint.slice(0, 8), error: error.message }, "Jupiter unexpected error");
      }
    }

    // For non-pump.fun tokens, try pump.fun as last resort
    // (some tokens might be on pump.fun but don't have "pump" suffix)
    if (!this.isPumpFunToken(mint)) {
      const pumpPrice = await this.fetchPumpFunPrice(mint);
      if (pumpPrice) {
        await this.updatePrice(pumpPrice);
        return pumpPrice;
      }
    }

    // No price found from any source - add to negative cache with dynamic TTL
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
    const now = Date.now();
    const heliusWsAge = now - this.lastHeliusWsMessage;
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
        lastHeliusWsMessageAgo: heliusWsAge,
        lastPumpPortalWsMessageAgo: pumpPortalWsAge,
        heliusWsStale: heliusWsAge > 60000, // > 1 minute
        pumpPortalWsStale: pumpPortalWsAge > 60000, // > 1 minute
        priceUpdatesStale: lastPriceAge > 30000, // > 30 seconds
        isHealthy: lastPriceAge < 60000 && this.ws?.readyState === WebSocket.OPEN
      },
      pumpPortal: this.pumpPortalWs?.getStats() || null,
      plan: "Developer (optimized v2)",
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
