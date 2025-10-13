// Event-driven price service with proper EventEmitter architecture
import { EventEmitter } from "events";
import redis from "./redis.js";

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

class EventDrivenPriceService extends EventEmitter {
  private priceCache = new Map<string, PriceTick>();
  private solPriceUsd = 100; // Default SOL price
  private updateIntervals: NodeJS.Timeout[] = [];

  constructor() {
    super();
    console.log("🚀 Initializing Event-Driven Price Service");
  }

  async start() {
    console.log("🚀 Starting Event-Driven Price Service...");
    
    // Get initial SOL price
    await this.updateSolPrice();
    
    // Set up regular price updates  
    const solInterval = setInterval(() => this.updateSolPrice(), 30000); // Every 30s
    const popularInterval = setInterval(() => this.updatePopularTokenPrices(), 60000); // Every 60s
    
    this.updateIntervals.push(solInterval, popularInterval);
    
    console.log("✅ Price service started with regular updates");
  }

  async stop() {
    console.log("🛑 Stopping price service...");
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals = [];
    this.removeAllListeners();
  }

  private async updateSolPrice() {
    try {
      console.log("🔄 Fetching SOL price from CoinGecko...");
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true");
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.solana?.usd) {
        const oldPrice = this.solPriceUsd;
        this.solPriceUsd = data.solana.usd;
        
        console.log(`📈 SOL price updated: $${this.solPriceUsd} (was $${oldPrice})`);
        
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
        console.warn("⚠️ Invalid response format from CoinGecko:", data);
      }
    } catch (error) {
      console.error("❌ Failed to update SOL price:", error);
    }
  }

  private async updatePopularTokenPrices() {
    console.log("🔄 Updating popular token prices...");
    
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
        console.warn(`⚠️ Failed to update price for ${mint}:`, error);
      }
    }
  }

  private async fetchTokenPrice(mint: string): Promise<PriceTick | null> {
    console.log(`🔍 Fetching price for token: ${mint}`);
    
    // Try DexScreener first
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0];
        const priceUsd = parseFloat(pair.priceUsd || "0");
        
        if (priceUsd > 0) {
          console.log(`💰 Found price for ${mint}: $${priceUsd} (DexScreener)`);
          return {
            mint,
            priceUsd,
            priceSol: priceUsd / this.solPriceUsd,
            solUsd: this.solPriceUsd,
            timestamp: Date.now(),
            source: "dexscreener",
            change24h: parseFloat(pair.priceChange?.h24 || "0")
          };
        }
      }
    } catch (error) {
      console.warn(`⚠️ DexScreener failed for ${mint}:`, error);
    }
    
    // Try Jupiter as fallback
    try {
      const response = await fetch(`https://price.jup.ag/v6/price?ids=${mint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data[mint] && data.data[mint].price) {
        const priceUsd = parseFloat(data.data[mint].price);
        console.log(`💰 Found price for ${mint}: $${priceUsd} (Jupiter)`);
        
        return {
          mint,
          priceUsd,
          priceSol: priceUsd / this.solPriceUsd,
          solUsd: this.solPriceUsd,
          timestamp: Date.now(),
          source: "jupiter"
        };
      }
    } catch (error) {
      console.warn(`⚠️ Jupiter failed for ${mint}:`, error);
    }
    
    console.warn(`❌ No price found for ${mint}`);
    return null;
  }

  private async updatePrice(tick: PriceTick) {
    console.log(`💰 Price update: ${tick.mint} = $${tick.priceUsd.toFixed(6)} (${tick.source})`);
    
    // Update in-memory cache
    this.priceCache.set(tick.mint, tick);
    
    // Store in Redis (optional - don't fail if Redis is unavailable)
    try {
      await redis.setex(`price:${tick.mint}`, 60, JSON.stringify(tick)); // 60s cache
      await redis.publish("prices", JSON.stringify(tick));
    } catch (error) {
      console.warn("⚠️ Redis cache/publish failed (continuing without Redis):", error);
    }
    
    // CRITICAL: Emit the event to all subscribers
    this.emit("price", tick);
    console.log(`📡 Emitted price event for ${tick.mint} to ${this.listenerCount('price')} subscribers`);
  }

  // Public API methods
  async getLastTick(mint: string): Promise<PriceTick | null> {
    // Try memory cache first
    let tick = this.priceCache.get(mint);
    
    if (!tick) {
      // Try Redis cache
      try {
        const cached = await redis.get(`price:${mint}`);
        if (cached) {
          tick = JSON.parse(cached);
          if (tick) {
            this.priceCache.set(mint, tick);
          }
        }
      } catch (error) {
        console.warn("⚠️ Redis get failed:", error);
      }
    }
    
    if (!tick) {
      // For SOL, return current price even if not cached
      if (mint === "So11111111111111111111111111111111111111112") {
        tick = {
          mint,
          priceUsd: this.solPriceUsd,
          priceSol: 1,
          solUsd: this.solPriceUsd,
          timestamp: Date.now(),
          source: "live"
        };
      }
    }
    
    return tick || null;
  }

  async getPrice(mint: string): Promise<number> {
    if (mint === "So11111111111111111111111111111111111111112") {
      return this.solPriceUsd;
    }
    
    const tick = await this.getLastTick(mint);
    return tick?.priceUsd || 0;
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

  // Subscription methods using EventEmitter
  onPriceUpdate(callback: (tick: PriceTick) => void): () => void {
    this.on("price", callback);
    console.log(`➕ Added price subscriber (total: ${this.listenerCount('price')})`);
    
    // Return unsubscribe function
    return () => {
      this.off("price", callback);
      console.log(`➖ Removed price subscriber (total: ${this.listenerCount('price')})`);
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