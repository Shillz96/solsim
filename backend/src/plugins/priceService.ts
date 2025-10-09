// Real-time price service using Helius RPC subscriptions
import WebSocket from "ws";
import { Connection, PublicKey } from "@solana/web3.js";
import { Decimal } from "@prisma/client/runtime/library";
import redis from "./redis.js";

// Program IDs for DEX monitoring
const RAYDIUM_AMM_PROGRAM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RAYDIUM_CLMM_PROGRAM = "CAMMCzo5YL8w4VFF8KVHrK22GGUQpMkFr9WeqwJGJUmK";
const PUMP_FUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

// Known quote tokens
const QUOTE_TOKENS = {
  "So11111111111111111111111111111111111111112": "SOL",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT"
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
}

class HeliusPriceService {
  private ws: WebSocket | null = null;
  private connection: Connection;
  private priceCache = new Map<string, PriceTick>();
  private solPriceUsd = 100; // Default SOL price, updated from external API
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers = new Set<(tick: PriceTick) => void>();

  constructor() {
    const heliusUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || "wss://mainnet.helius-rpc.com";
    this.connection = new Connection(heliusUrl.replace("wss://", "https://"));
  }

  async start() {
    console.log("🚀 Starting Helius price service...");
    
    // Get initial SOL price from external API
    await this.updateSolPrice();
    
    // Start WebSocket connection for real-time data
    await this.connectWebSocket();
    
    // Update SOL price every 30 seconds
    setInterval(() => this.updateSolPrice(), 30000);
  }

  private async connectWebSocket() {
    try {
      const wsUrl = (process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || "wss://mainnet.helius-rpc.com")
        .replace("https://", "wss://");
      
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

      this.ws.on("close", () => {
        console.log("❌ Helius WebSocket disconnected");
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

    // Subscribe to Raydium AMM program
    this.ws.send(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "programSubscribe",
      params: [
        RAYDIUM_AMM_PROGRAM,
        {
          commitment: "confirmed",
          encoding: "jsonParsed",
          filters: [
            { dataSize: 752 } // Raydium pool account size
          ]
        }
      ]
    }));

    // Subscribe to Raydium CLMM program
    this.ws.send(JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "programSubscribe",
      params: [
        RAYDIUM_CLMM_PROGRAM,
        {
          commitment: "confirmed",
          encoding: "jsonParsed"
        }
      ]
    }));

    // Subscribe to Pump.fun program
    this.ws.send(JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "programSubscribe",
      params: [
        PUMP_FUN_PROGRAM,
        {
          commitment: "confirmed",
          encoding: "jsonParsed"
        }
      ]
    }));

    console.log("📡 Subscribed to DEX programs");
  }

  private handleWebSocketMessage(message: any) {
    if (message.method === "programNotification") {
      this.parseSwapEvent(message.params);
    }
  }

  private async parseSwapEvent(params: any) {
    try {
      const { result } = params;
      const { account, context } = result;
      
      // Parse transaction logs to extract swap data
      const logs = account?.data?.parsed?.info?.logs || [];
      
      for (const log of logs) {
        if (log.includes("swap") || log.includes("Swap")) {
          const swapData = this.extractSwapData(log, account);
          if (swapData) {
            await this.processPriceTick(swapData);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing swap event:", error);
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
        const isTokenInQuote = Object.values(QUOTE_TOKENS).includes(tokenIn);
        const isTokenOutQuote = Object.values(QUOTE_TOKENS).includes(tokenOut);
        
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

  private async processPriceTick(tick: PriceTick) {
    // Update in-memory cache
    this.priceCache.set(tick.mint, tick);
    
    // Store in Redis with 1 hour expiry
    try {
      await redis.setex(`price:${tick.mint}`, 3600, JSON.stringify(tick));
    } catch (error) {
      console.warn("Failed to cache price in Redis:", error);
    }
    
    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(tick);
      } catch (error) {
        console.error("Error in price subscriber callback:", error);
      }
    });
    
    console.log(`💰 Price update: ${tick.mint} = $${tick.priceUsd.toFixed(6)}`);
  }

  private async updateSolPrice() {
    try {
      // Get SOL price from CoinGecko or similar
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const data = await response.json();
      
      if (data.solana?.usd) {
        this.solPriceUsd = data.solana.usd;
        console.log(`📈 SOL price updated: $${this.solPriceUsd}`);
      }
    } catch (error) {
      console.warn("Failed to update SOL price:", error);
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

// Export singleton instance
const priceService = new HeliusPriceService();
export default priceService;