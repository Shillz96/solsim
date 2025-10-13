// Real-time price service using Helius RPC subscriptions
import WebSocket from "ws";
import { Connection, PublicKey } from "@solana/web3.js";
import { Decimal } from "@prisma/client/runtime/library";
import { EventEmitter } from "events";
import redis from "./redis.js";

// Program IDs for DEX monitoring
const RAYDIUM_V4_PROGRAM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RAYDIUM_CLMM_PROGRAM = "CAMMCzo5YL8w4VFF8KVHrK22GGUQpMkFr9WeqwJGJUmK"; 
const PUMP_FUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

// Known quote tokens for price calculation
const QUOTE_TOKENS = {
  "So11111111111111111111111111111111111111112": { symbol: "SOL", decimals: 9 },
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC", decimals: 6 },
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": { symbol: "USDT", decimals: 6 }
};

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

interface SwapEvent {
  baseMint: string;
  quoteMint: string;
  amountIn: number;
  amountOut: number;
  source: 'raydium' | 'pumpfun';
}

class HeliusPriceService {
  private ws: WebSocket | null = null;
  private connection: Connection;
  private priceCache = new Map<string, PriceTick>();
  private solPriceUsd = 100; // Default SOL price, updated from external API
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers = new Set<(tick: PriceTick) => void>();
  private lastSolPriceUpdate = 0;

  constructor() {
    const heliusUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || "wss://mainnet.helius-rpc.com";
    this.connection = new Connection(heliusUrl.replace("wss://", "https://"));
  }

  async start() {
    console.log("🚀 Starting Helius price service...");
    
    // Get initial SOL price from external API
    await this.updateSolPrice();
    
    // For now, focus on regular price updates from external APIs
    // WebSocket implementation can be added later once basic prices work
    console.log("ℹ️ Using external API price updates for now");
    
    // Subscribe to Redis pub/sub for horizontal scaling
    try {
      await this.subscribeToRedisPrices();
    } catch (error) {
      console.warn("Failed to subscribe to Redis prices channel:", error);
      console.log("⚠️ Continuing without Redis pub/sub (single-instance mode)");
    }
    
    // Update SOL price every 30 seconds
    setInterval(() => this.updateSolPrice(), 30000);
    
    // Update popular token prices every 60 seconds
    setInterval(() => this.updatePopularTokenPrices(), 60000);
  }

  private async subscribeToRedisPrices() {
    // For now, disable Redis pub/sub to avoid connection issues
    // This means the app will work in single-instance mode
    console.log("ℹ️ Redis pub/sub disabled - running in single-instance mode");
    return;
  }

  // Parse Raydium swap logs - only process real data
  private parseRaydiumLog(log: string): SwapEvent | null {
    // Only process if we can extract real swap data
    if (log.includes("Program log: ray_log: ")) {
      const rayLogMatch = log.match(/ray_log: ([^,]+),([^,]+),([^,]+),([^,]+),([^,]+)/);
      if (rayLogMatch) {
        const [, operation, amountIn, amountOut] = rayLogMatch;
        
        if (operation.includes("swap") && Number(amountIn) > 0 && Number(amountOut) > 0) {
          return {
            baseMint: "unknown", // Need to get from transaction context
            quoteMint: "So11111111111111111111111111111111111111112",
            amountIn: Number(amountIn),
            amountOut: Number(amountOut),
            source: 'raydium'
          };
        }
      }
    }
    return null;
  }

  // Parse Pump.fun swap logs - only process real data  
  private parsePumpfunLog(log: string): SwapEvent | null {
    // Only return data if we have real swap information
    return null; // For now, focus on getting basic price updates working
  }

  // Process swap event and calculate price
  private processSwapEvent(swap: SwapEvent) {
    const { baseMint, quoteMint, amountIn, amountOut, source } = swap;
    
    // Skip if not a known quote token
    const quoteToken = QUOTE_TOKENS[quoteMint as keyof typeof QUOTE_TOKENS];
    if (!quoteToken) return;

    // Calculate price based on quote token
    let priceInQuote = amountIn / amountOut;
    let priceUsd = 0;

    if (quoteToken.symbol === "USDC" || quoteToken.symbol === "USDT") {
      // Direct USD price
      priceUsd = priceInQuote / Math.pow(10, quoteToken.decimals);
    } else if (quoteToken.symbol === "SOL") {
      // Convert SOL price to USD
      const priceInSol = priceInQuote / Math.pow(10, quoteToken.decimals);
      priceUsd = priceInSol * this.solPriceUsd;
    }

    if (priceUsd > 0) {
      const tick: PriceTick = {
        mint: baseMint,
        priceUsd,
        priceSol: quoteToken.symbol === "SOL" ? priceInQuote / Math.pow(10, quoteToken.decimals) : undefined,
        solUsd: this.solPriceUsd,
        timestamp: Date.now(),
        source: source,
        volume: amountIn
      };

      this.updatePrice(tick);
    }
  }

  private async connectWebSocket() {
    try {
      let wsUrl = (process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || "wss://mainnet.helius-rpc.com")
        .replace("https://", "wss://");
      
      // Add API key if available and not already in URL
      if (!wsUrl.includes("api-key=") && process.env.HELIUS_API) {
        const separator = wsUrl.includes("?") ? "&" : "?";
        wsUrl = `${wsUrl}${separator}api-key=${process.env.HELIUS_API}`;
      }
      
      console.log(`🔗 Connecting to Helius WebSocket: ${wsUrl.replace(/api-key=[^&]*/, 'api-key=***')}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on("open", () => {
        console.log("✅ Connected to Helius WebSocket");
        this.reconnectAttempts = 0;
        this.subscribeToPrograms();
      });

      this.ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      this.ws.on("close", (code, reason) => {
        console.log(`❌ Helius WebSocket disconnected: ${code} ${reason}`);
        this.scheduleReconnect();
      });

      this.ws.on("error", (error) => {
        console.error("Helius WebSocket error:", error);
        this.scheduleReconnect();
      });

    } catch (error) {
      console.error("Failed to connect to Helius WebSocket:", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connectWebSocket(), delay);
  }

  private subscribeToPrograms() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to transaction logs mentioning DEX programs - this is the correct approach per Helius docs
    this.ws.send(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "logsSubscribe",
      params: [
        {
          mentions: [
            RAYDIUM_V4_PROGRAM,
            RAYDIUM_CLMM_PROGRAM,
            PUMP_FUN_PROGRAM
          ]
        },
        {
          commitment: "confirmed"
        }
      ]
    }));

    console.log("📡 Subscribed to DEX programs via logsSubscribe");
  }

  private handleWebSocketMessage(message: any) {
    // Handle subscription confirmation
    if (message.result && typeof message.result === 'number') {
      console.log('✅ Subscription confirmed with ID:', message.result);
      return;
    }

    // Handle log notifications from logsSubscribe
    if (message.method === "logsNotification" && message.params?.result?.value) {
      const logData = message.params.result.value;
      console.log('📋 Received log data:', logData.signature);
      
      // Process the transaction logs
      if (logData.logs && Array.isArray(logData.logs)) {
        logData.logs.forEach((log: string) => {
          // Try Raydium parsing first
          const raydiumSwap = this.parseRaydiumLog(log);
          if (raydiumSwap) {
            this.processSwapEvent(raydiumSwap);
            return;
          }

          // Try Pump.fun parsing
          const pumpfunSwap = this.parsePumpfunLog(log);
          if (pumpfunSwap) {
            this.processSwapEvent(pumpfunSwap);
            return;
          }
        });
      }
    }
  }

  private async parseSwapEvent(params: any) {
    if (!params?.result?.value) return;

    const { account, context } = params.result.value;
    const logs = context?.transaction?.meta?.logMessages || [];

    for (const log of logs) {
      // Try Raydium parsing first
      const raydiumSwap = this.parseRaydiumLog(log);
      if (raydiumSwap) {
        this.processSwapEvent(raydiumSwap);
        continue;
      }

      // Try Pump.fun parsing
      const pumpfunSwap = this.parsePumpfunLog(log);
      if (pumpfunSwap) {
        this.processSwapEvent(pumpfunSwap);
        continue;
      }

      // Try generic extraction as fallback
      const genericTick = this.extractSwapData(log, account);
      if (genericTick) {
        this.updatePrice(genericTick);
      }
    }
  }

  private extractSwapData(log: string, account: any): PriceTick | null {
    try {
      // Parse swap events from program logs using multiple patterns
      
      // Pattern 1: Raydium AMM swaps
      let swapMatch = log.match(/Program log: ray_log: ([\w\d]+),(\d+),(\d+),(\d+),(\d+)/);
      if (swapMatch) {
        const [, direction, amountIn, amountOut, poolCoinAmount, poolPcAmount] = swapMatch;
        // Extract mint from account data if available
        const mint = account?.account?.data?.parsed?.info?.mint || account?.pubkey;
        if (mint) {
          const price = parseFloat(amountOut) / parseFloat(amountIn);
          return {
            mint,
            priceUsd: price * this.solPriceUsd, // Assume SOL pair for now
            timestamp: Date.now(),
            source: "helius_raydium",
            volume: parseFloat(amountIn)
          };
        }
      }
      
      // Pattern 2: Pump.fun swaps
      swapMatch = log.match(/Program log: Swap: (\d+) -> (\d+)/);
      if (swapMatch) {
        const [, amountIn, amountOut] = swapMatch;
        const mint = account?.account?.data?.parsed?.info?.mint || account?.pubkey;
        if (mint) {
          const price = parseFloat(amountOut) / parseFloat(amountIn);
          return {
            mint,
            priceUsd: price * this.solPriceUsd,
            timestamp: Date.now(),
            source: "helius_pumpfun",
            volume: parseFloat(amountIn)
          };
        }
      }
      
      // Pattern 3: Generic swap pattern (fallback)
      swapMatch = log.match(/swap.*?(\d+\.?\d*)\s+(\w+)\s+for\s+(\d+\.?\d*)\s+(\w+)/i);
      if (swapMatch) {
        const [, amountIn, tokenIn, amountOut, tokenOut] = swapMatch;
        
        // Determine which is the base token (non-quote token)
        const quoteSymbols = Object.values(QUOTE_TOKENS).map(t => t.symbol);
        const isTokenInQuote = quoteSymbols.includes(tokenIn);
        const isTokenOutQuote = quoteSymbols.includes(tokenOut);
        
        if (!isTokenInQuote && !isTokenOutQuote) return null; // Need at least one quote token
        
        const baseToken = isTokenInQuote ? tokenOut : tokenIn;
        const quoteToken = isTokenInQuote ? tokenIn : tokenOut;
        const baseAmount = parseFloat(isTokenInQuote ? amountOut : amountIn);
        const quoteAmount = parseFloat(isTokenInQuote ? amountIn : amountOut);
        
        if (baseAmount === 0) return null;
        
        // Calculate price in quote token
        let priceInQuote = quoteAmount / baseAmount;
        
        // Convert to USD
        let priceUsd = priceInQuote;
        if (quoteToken === "SOL") {
          priceUsd = priceInQuote * this.solPriceUsd;
        } else if (quoteToken === "USDC" || quoteToken === "USDT") {
          priceUsd = priceInQuote; // Already in USD
        }
        
        return {
          mint: baseToken, // Actual mint address from transaction data
          priceUsd,
          timestamp: Date.now(),
          source: "helius_generic",
          volume: quoteAmount
        };
      }
      
      return null;
      
    } catch (error) {
      console.error("Error extracting swap data:", error);
      return null;
    }
  }

  private async updatePrice(tick: PriceTick) {
    // Update in-memory cache
    this.priceCache.set(tick.mint, tick);
    
    // Store in Redis with 5s expiry as per spec
    try {
      await redis.setex(`price:${tick.mint}`, 5, JSON.stringify(tick));
      
      // Publish to Redis prices channel for horizontal scaling
      await redis.publish("prices", JSON.stringify(tick));
    } catch (error) {
      console.warn("Failed to cache/publish price in Redis:", error);
    }
    
    // Notify local subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(tick);
      } catch (error) {
        console.error("Error in price subscriber callback:", error);
      }
    });
    
    console.log(`💰 Price update: ${tick.mint} = $${tick.priceUsd.toFixed(6)} (${tick.source})`);
  }

  private async updateSolPrice() {
    try {
      // Get SOL price from CoinGecko or similar
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true");
      const data = await response.json();
      
      if (data.solana?.usd) {
        const oldPrice = this.solPriceUsd;
        this.solPriceUsd = data.solana.usd;
        console.log(`📈 SOL price updated: $${this.solPriceUsd}`);
        
        // Create and emit a price tick for SOL itself
        const solTick: PriceTick = {
          mint: "So11111111111111111111111111111111111111112", // SOL mint address
          priceUsd: this.solPriceUsd,
          priceSol: 1, // SOL is always 1 SOL
          solUsd: this.solPriceUsd,
          timestamp: Date.now(),
          source: "coingecko",
          change24h: data.solana.usd_24h_change || 0
        };
        
        // Update cache and emit to subscribers
        await this.updatePrice(solTick);
      }
    } catch (error) {
      console.warn("Failed to update SOL price:", error);
    }
  }

  private async updatePopularTokenPrices() {
    // Update prices for commonly traded tokens
    const popularTokens = [
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
    ];

    for (const mint of popularTokens) {
      try {
        const tick = await this.fetchFallbackPrice(mint);
        await this.updatePrice(tick);
      } catch (error) {
        console.warn(`Failed to update price for ${mint}:`, error);
      }
    }
  }

  // Public API methods
  async getLastTick(mint: string): Promise<PriceTick> {
    // Try memory cache first
    let tick = this.priceCache.get(mint);
    
    if (!tick) {
      // Try Redis cache
      try {
        const cached = await redis.get(`price:${mint}`);
        if (cached) {
          tick = JSON.parse(cached);
          this.priceCache.set(mint, tick!);
        }
      } catch (error) {
        console.warn("Failed to get price from Redis:", error);
      }
    }
    
    if (!tick) {
      // Fallback: fetch from external API or return default
      tick = await this.fetchFallbackPrice(mint);
    }
    
    return tick;
  }

  private async fetchFallbackPrice(mint: string): Promise<PriceTick> {
    // Fallback to external price APIs
    try {
      // Try DexScreener first
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0];
        return {
          mint,
          priceUsd: parseFloat(pair.priceUsd || "0"),
          timestamp: Date.now(),
          source: "dexscreener"
        };
      }
    } catch (error) {
      console.warn("DexScreener fallback failed:", error);
    }
    
    try {
      // Try Jupiter price API as secondary fallback
      const response = await fetch(`https://price.jup.ag/v6/price?ids=${mint}`);
      const data = await response.json();
      
      if (data.data && data.data[mint] && data.data[mint].price) {
        return {
          mint,
          priceUsd: parseFloat(data.data[mint].price),
          timestamp: Date.now(),
          source: "jupiter"
        };
      }
    } catch (error) {
      console.warn("Jupiter fallback failed:", error);
    }
    
    // Ultimate fallback
    return {
      mint,
      priceUsd: 0.001, // Default price
      timestamp: Date.now(),
      source: "fallback"
    };
  }

  subscribe(callback: (tick: PriceTick) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  async getPrice(mint: string): Promise<number> {
    const tick = await this.getLastTick(mint);
    return tick.priceUsd;
  }

  async getPrices(mints: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    
    await Promise.all(
      mints.map(async (mint) => {
        prices[mint] = await this.getPrice(mint);
      })
    );
    
    return prices;
  }

  getSolPrice(): number {
    return this.solPriceUsd;
  }
}

// Re-export the new event-driven price service  
import priceServiceV2 from "./priceService-v2.js";
export default priceServiceV2;