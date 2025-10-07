import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';
import { chunkArray } from '../utils/helpers';

// Token ID mapping for CoinGecko
const COINGECKO_IDS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'solana',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',
  // Add more as needed
};

interface CachedPrice {
  price: number;
  timestamp: number;
}

class JupiterPriceService {
  private cgUrl: string = 'https://api.coingecko.com/api/v3';
  private jupiterPriceUrl: string = 'https://api.jup.ag/price/v2';
  private jupiterApiUrl: string = 'https://api.jup.ag/v6';
  private axiosInstance: AxiosInstance;
  private priceCache: Map<string, CachedPrice> = new Map();
  private cacheTTL: number = 60000; // 1 minute cache
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1500; // 1.5 seconds between requests

  constructor() {
    this.axiosInstance = axios.create({ timeout: 10000 });
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  async getPrice(mintAddress: string): Promise<number | null> {
    try {
      // Check cache first
      const cached = this.priceCache.get(mintAddress);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.price;
      }

      const cgId = COINGECKO_IDS[mintAddress];
      if (!cgId) {
        return null;
      }

      // Rate limit
      await this.waitForRateLimit();

      const url = `${this.cgUrl}/simple/price?ids=${cgId}&vs_currencies=usd`;
      const response = await this.axiosInstance.get(url);
      const price = response.data?.[cgId]?.usd;

      if (price) {
        const priceNum = parseFloat(price);
        // Store in cache
        this.priceCache.set(mintAddress, {
          price: priceNum,
          timestamp: Date.now()
        });
        return priceNum;
      }
      return null;
    } catch (error: any) {
      logger.debug(`Failed to get price for ${mintAddress}: ${error.message}`);
      return null;
    }
  }

  async getPriceFromDexScreener(mintAddress: string): Promise<number | null> {
    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`;
      const response = await this.axiosInstance.get(url);

      if (response.data?.pairs && response.data.pairs.length > 0) {
        // Get the pair with highest liquidity
        const sortedPairs = response.data.pairs.sort((a: any, b: any) =>
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );

        const price = parseFloat(sortedPairs[0].priceUsd);
        if (price && !isNaN(price)) {
          // Cache the price
          this.priceCache.set(mintAddress, {
            price,
            timestamp: Date.now()
          });
          return price;
        }
      }

      return null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Get accurate price in SOL using DexScreener with improved pair selection
   * Jupiter Quote API includes slippage/impact, so we use spot prices from DEX pairs
   */
  async getPriceSolFromJupiter(mintAddress: string, forceRefresh: boolean = false): Promise<number | null> {
    // Use DexScreener for accurate spot prices (not quote prices with slippage)
    return this.getPriceSolFromDexScreener(mintAddress, forceRefresh);
  }

  async getPriceSolFromDexScreener(mintAddress: string, forceRefresh: boolean = false): Promise<number | null> {
    try {
      const cacheKey = `${mintAddress}_sol`;

      // Skip cache if forceRefresh is true
      if (!forceRefresh) {
        const cached = this.priceCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
          return cached.price;
        }
      }

      const url = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`;
      const response = await this.axiosInstance.get(url);

      if (response.data?.pairs && response.data.pairs.length > 0) {
        // Find SOL pairs (base token is our token, quote is SOL)
        const solPairs = response.data.pairs.filter((p: any) =>
          p.quoteToken?.symbol === 'SOL' ||
          p.quoteToken?.address === 'So11111111111111111111111111111111111111112'
        );

        if (solPairs.length > 0) {
          // Sort by liquidity + recent activity
          const scored = solPairs.map((pair: any) => {
            const liquidity = pair.liquidity?.usd || 0;
            const volume5m = pair.volume?.m5 || 0;
            const recentTxns = (pair.txns?.m5?.buys || 0) + (pair.txns?.m5?.sells || 0);
            // Prioritize: 60% liquidity, 30% volume, 10% transaction count
            return {
              pair,
              score: liquidity * 0.6 + volume5m * 0.3 + recentTxns * 100 * 0.1,
            };
          }).sort((a: any, b: any) => b.score - a.score);

          const bestPair = scored[0].pair;
          const priceSol = parseFloat(bestPair.priceNative);

          if (priceSol && !isNaN(priceSol) && priceSol > 0) {
            this.priceCache.set(cacheKey, { price: priceSol, timestamp: Date.now() });
            return priceSol;
          }
        }

        // Fallback: Use highest liquidity pair and convert USD to SOL
        const sortedByLiquidity = response.data.pairs.sort((a: any, b: any) =>
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );

        const bestPair = sortedByLiquidity[0];
        const priceUsd = parseFloat(bestPair.priceUsd);

        if (priceUsd && !isNaN(priceUsd) && priceUsd > 0) {
          const solPriceUsd = await this.getSolPriceUsd();
          if (solPriceUsd && solPriceUsd > 0) {
            const priceSol = priceUsd / solPriceUsd;
            this.priceCache.set(cacheKey, { price: priceSol, timestamp: Date.now() });
            logger.debug(`[DexScreener] Used USD conversion for ${mintAddress.slice(0, 8)}: $${priceUsd} / $${solPriceUsd} = ${priceSol} SOL`);
            return priceSol;
          }
        }
      }

      return null;
    } catch (error: any) {
      logger.debug(`Failed to get SOL price from DexScreener for ${mintAddress}: ${error.message}`);
      return null;
    }
  }

  private async getSolPriceUsd(): Promise<number | null> {
    try {
      // Try CoinGecko first (free, no API key needed)
      const response = await this.axiosInstance.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
      );
      const price = response.data?.solana?.usd;
      if (price) return parseFloat(price);

      return null;
    } catch (error: any) {
      logger.debug(`Failed to get SOL price: ${error.message}`);
      return null;
    }
  }

  async getPrices(mintAddresses: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    if (mintAddresses.length === 0) return priceMap;

    // Fetch prices sequentially to avoid rate limits
    for (const mint of mintAddresses) {
      // Check cache first
      const cached = this.priceCache.get(mint);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        priceMap.set(mint, cached.price);
        continue;
      }

      // Try CoinGecko for known tokens first
      if (COINGECKO_IDS[mint]) {
        const price = await this.getPrice(mint);
        if (price) {
          priceMap.set(mint, price);
          continue;
        }
      }

      // Fall back to DexScreener for unknown tokens
      const price = await this.getPriceFromDexScreener(mint);
      if (price) {
        priceMap.set(mint, price);
      }

      // Rate limit between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.debug(`Fetched prices for ${priceMap.size}/${mintAddresses.length} tokens`);
    return priceMap;
  }
}

export default new JupiterPriceService();
