import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import prisma from '../lib/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import { cacheService } from './cacheService.js';
import { monitoringService, trackPriceUpdate, trackCacheOperation } from './monitoringService.js';

/**
 * Price Service - Unified price fetching and caching
 * 
 * This service handles all price-related operations with:
 * - Multiple data source support (DexScreener, Birdeye, CoinGecko, Database)
 * - Intelligent fallback mechanisms
 * - In-memory caching with TTL
 * - Batch price fetching for efficiency
 * - Rate limiting and error handling
 * 
 * Data Source Priority:
 * 1. Memory cache (if fresh)
 * 2. DexScreener API (free, reliable, real-time)
 * 3. Birdeye API (if API key available)
 * 4. Database cache (last known price)
 * 5. CoinGecko API (for SOL price)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TokenPrice {
  address: string;
  price: number; // USD per token
  priceChange24h?: number;
  volume24h?: number;
  liquidity?: number;
  marketCap?: number;
  timestamp: number;
  source: 'dexscreener' | 'birdeye' | 'coingecko' | 'database';
}

export interface PriceCache {
  price: number;
  timestamp: number;
  source: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL = 30; // 30 seconds Redis TTL
const MEMORY_CACHE_TTL = 10 * 1000; // 10 seconds in-memory fallback
const BATCH_SIZE = 50; // Max tokens per batch request
const REQUEST_TIMEOUT = 5000; // 5 second timeout
const RATE_LIMIT_DELAY = 100; // 100ms between requests

// Cache key prefixes
const CACHE_KEYS = {
  TOKEN_PRICE: 'price:token:',
  SOL_PRICE: 'price:sol',
  BATCH_PRICES: 'price:batch:',
} as const;

// SOL token addresses for different sources
const SOL_ADDRESSES = {
  WRAPPED: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  COINGECKO_ID: 'solana',
};

// ============================================================================
// PRICE SERVICE CLASS
// ============================================================================

export class PriceService {
  private priceCache: Map<string, PriceCache> = new Map();
  private lastRequestTime: number = 0;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;

  /**
   * Get current price for a single token
   * Uses Redis caching with memory fallback
   */
  async getPrice(tokenAddress: string): Promise<TokenPrice | null> {
    try {
      const cacheKey = CACHE_KEYS.TOKEN_PRICE + tokenAddress;

      // 1. Check Redis cache first
      const redisPrice = await cacheService.get<TokenPrice>(cacheKey);
      if (redisPrice) {
        logger.debug(`Price cache hit (Redis): ${tokenAddress}`);
        trackCacheOperation('get', 'hit');
        return redisPrice;
      }

      // 2. Check memory cache as fallback
      const memoryPrice = this.getCachedPrice(tokenAddress);
      if (memoryPrice) {
        logger.debug(`Price cache hit (Memory): ${tokenAddress}`);
        trackCacheOperation('get', 'hit');
        return {
          address: tokenAddress,
          price: memoryPrice.price,
          timestamp: memoryPrice.timestamp,
          source: memoryPrice.source as any,
        };
      }

      trackCacheOperation('get', 'miss');

      // 3. Fetch from external APIs
      const price = await this.fetchPriceWithFallback(tokenAddress);
      
      if (price) {
        // Cache in both Redis and memory
        await this.cachePrice(tokenAddress, price);
        trackPriceUpdate(price.source, 'success');
      } else {
        trackPriceUpdate('unknown', 'error');
      }

      return price;
    } catch (error) {
      logger.error(`Error getting price for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens efficiently
   * Uses Redis batch operations for optimal performance
   */
  async getPrices(tokenAddresses: string[]): Promise<Map<string, TokenPrice>> {
    const results = new Map<string, TokenPrice>();

    try {
      if (tokenAddresses.length === 0) {
        return results;
      }

      // Generate cache keys for all tokens
      const cacheKeys = tokenAddresses.map(addr => CACHE_KEYS.TOKEN_PRICE + addr);
      
      // 1. Batch fetch from Redis
      const redisResults = await cacheService.mget<TokenPrice>(cacheKeys);
      
      // Track which tokens we still need to fetch
      const uncachedTokens: string[] = [];
      
      // Process Redis results
      for (let i = 0; i < tokenAddresses.length; i++) {
        const address = tokenAddresses[i];
        const cacheKey = cacheKeys[i];
        const redisPrice = redisResults.get(cacheKey);
        
        if (redisPrice) {
          results.set(address, redisPrice);
          logger.debug(`Batch price cache hit (Redis): ${address}`);
        } else {
          // 2. Check memory cache as fallback
          const memoryPrice = this.getCachedPrice(address);
          if (memoryPrice) {
            const tokenPrice: TokenPrice = {
              address,
              price: memoryPrice.price,
              timestamp: memoryPrice.timestamp,
              source: memoryPrice.source as any,
            };
            results.set(address, tokenPrice);
            logger.debug(`Batch price cache hit (Memory): ${address}`);
          } else {
            uncachedTokens.push(address);
          }
        }
      }

      // 3. Fetch uncached tokens in batches
      if (uncachedTokens.length > 0) {
        logger.debug(`Fetching ${uncachedTokens.length} uncached prices`);
        const batches = this.splitIntoBatches(uncachedTokens, BATCH_SIZE);

        for (const batch of batches) {
          const batchPrices = await this.fetchBatchPrices(batch);
          
          // Cache and add to results
          const cacheEntries: Array<[string, TokenPrice]> = [];
          
          batchPrices.forEach((price, address) => {
            results.set(address, price);
            cacheEntries.push([CACHE_KEYS.TOKEN_PRICE + address, price]);
            // Also cache in memory
            this.cachePrice(address, price);
          });

          // Batch cache to Redis
          if (cacheEntries.length > 0) {
            await cacheService.mset(cacheEntries, { ttl: CACHE_TTL });
          }

          // Rate limiting between batches
          await this.waitForRateLimit();
        }
      }

      logger.debug(`Batch price fetch complete: ${results.size}/${tokenAddresses.length} prices retrieved`);
      return results;
    } catch (error) {
      logger.error('Error getting batch prices:', error);
      return results;
    }
  }

  /**
   * Get SOL price in USD
   * Special handling for SOL with Redis caching and multiple fallbacks
   */
  async getSolPrice(): Promise<number> {
    try {
      // 1. Check Redis cache first
      const redisPrice = await cacheService.get<TokenPrice>(CACHE_KEYS.SOL_PRICE);
      if (redisPrice) {
        logger.debug('SOL price cache hit (Redis)');
        return redisPrice.price;
      }

      // 2. Check memory cache
      const cached = this.getCachedPrice('SOL');
      if (cached) {
        logger.debug('SOL price cache hit (Memory)');
        return cached.price;
      }

      // 3. Try DexScreener for wrapped SOL
      const dexPrice = await this.fetchDexScreenerPrice(SOL_ADDRESSES.WRAPPED);
      if (dexPrice) {
        const solPrice: TokenPrice = {
          address: 'SOL',
          price: dexPrice.price,
          timestamp: Date.now(),
          source: 'dexscreener'
        };
        
        // Cache in both Redis and memory
        await cacheService.set(CACHE_KEYS.SOL_PRICE, solPrice, { ttl: CACHE_TTL });
        await this.cachePrice('SOL', solPrice);
        
        return dexPrice.price;
      }

      // 4. Fallback to CoinGecko
      const cgPrice = await this.fetchCoinGeckoPrice(SOL_ADDRESSES.COINGECKO_ID);
      if (cgPrice) {
        const solPrice: TokenPrice = {
          address: 'SOL',
          price: cgPrice.price,
          timestamp: Date.now(),
          source: 'coingecko'
        };
        
        // Cache in both Redis and memory
        await cacheService.set(CACHE_KEYS.SOL_PRICE, solPrice, { ttl: CACHE_TTL });
        await this.cachePrice('SOL', solPrice);
        
        return cgPrice.price;
      }

      // 5. Last resort: database cache
      const dbPrice = await this.getLastKnownPriceFromDb('SOL');
      if (dbPrice) {
        logger.warn('Using database fallback for SOL price');
        return dbPrice;
      }

      // Default fallback
      logger.warn('Could not fetch SOL price, using default');
      return 240; // Conservative default
    } catch (error) {
      logger.error('Error getting SOL price:', error);
      return 240; // Default fallback
    }
  }

  /**
   * Fetch price with intelligent fallback chain
   */
  private async fetchPriceWithFallback(tokenAddress: string): Promise<TokenPrice | null> {
    // Try DexScreener first (free, reliable)
    const dexPrice = await this.fetchDexScreenerPrice(tokenAddress);
    if (dexPrice) return dexPrice;

    // Try Birdeye if API key available
    if (config.apis.birdeye.apiKey) {
      const birdeyePrice = await this.fetchBirdeyePrice(tokenAddress);
      if (birdeyePrice) return birdeyePrice;
    }

    // Fallback to database cache
    const dbPrice = await this.getLastKnownPriceFromDb(tokenAddress);
    if (dbPrice) {
      return {
        address: tokenAddress,
        price: dbPrice,
        timestamp: Date.now(),
        source: 'database',
      };
    }

    return null;
  }

  /**
   * Fetch price from DexScreener API
   */
  private async fetchDexScreenerPrice(tokenAddress: string): Promise<TokenPrice | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(
        `${config.apis.dexscreener.baseUrl}/dex/tokens/${tokenAddress}`,
        {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.debug(`DexScreener API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      // Find SOL pair with highest liquidity
      const solPair = data.pairs
        ?.filter((p: any) => p.chainId === 'solana')
        ?.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

      if (!solPair?.priceUsd) {
        return null;
      }

      return {
        address: tokenAddress,
        price: parseFloat(solPair.priceUsd),
        priceChange24h: solPair.priceChange?.h24 ? parseFloat(solPair.priceChange.h24) : undefined,
        volume24h: solPair.volume?.h24 ? parseFloat(solPair.volume.h24) : undefined,
        liquidity: solPair.liquidity?.usd ? parseFloat(solPair.liquidity.usd) : undefined,
        marketCap: solPair.marketCap ? parseFloat(solPair.marketCap) : undefined,
        timestamp: Date.now(),
        source: 'dexscreener',
      };
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        logger.debug(`DexScreener fetch error for ${tokenAddress}:`, error);
      }
      return null;
    }
  }

  /**
   * Fetch price from Birdeye API
   */
  private async fetchBirdeyePrice(tokenAddress: string): Promise<TokenPrice | null> {
    try {
      if (!config.apis.birdeye.apiKey) {
        return null;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(
        `${config.apis.birdeye.baseUrl}/defi/price?address=${tokenAddress}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'X-API-KEY': config.apis.birdeye.apiKey,
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data.data?.value) {
        return null;
      }

      return {
        address: tokenAddress,
        price: data.data.value,
        priceChange24h: data.data.priceChange24h,
        timestamp: Date.now(),
        source: 'birdeye',
      };
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        logger.debug(`Birdeye fetch error for ${tokenAddress}:`, error);
      }
      return null;
    }
  }

  /**
   * Fetch price from CoinGecko API (for major tokens like SOL)
   */
  private async fetchCoinGeckoPrice(coinId: string): Promise<TokenPrice | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const url = config.apis.coingecko.apiKey
        ? `${config.apis.coingecko.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24h_change=true&x_cg_pro_api_key=${config.apis.coingecko.apiKey}`
        : `${config.apis.coingecko.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24h_change=true`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data[coinId]?.usd) {
        return null;
      }

      return {
        address: coinId,
        price: data[coinId].usd,
        priceChange24h: data[coinId].usd_24h_change,
        timestamp: Date.now(),
        source: 'coingecko',
      };
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        logger.debug(`CoinGecko fetch error for ${coinId}:`, error);
      }
      return null;
    }
  }

  /**
   * Fetch batch prices (parallel requests)
   */
  private async fetchBatchPrices(tokenAddresses: string[]): Promise<Map<string, TokenPrice>> {
    const results = new Map<string, TokenPrice>();

    // Fetch all prices in parallel with rate limiting
    const promises = tokenAddresses.map(async (address) => {
      const price = await this.fetchPriceWithFallback(address);
      if (price) {
        results.set(address, price);
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Get last known price from database cache
   */
  private async getLastKnownPriceFromDb(tokenAddress: string): Promise<number | null> {
    try {
      const token = await prisma.token.findUnique({
        where: { address: tokenAddress },
        select: { lastPrice: true, lastTs: true },
      });

      if (!token?.lastPrice) {
        return null;
      }

      // Only use if less than 5 minutes old
      const ageMs = Date.now() - (token.lastTs?.getTime() || 0);
      if (ageMs > 5 * 60 * 1000) {
        return null;
      }

      return token.lastPrice.toNumber();
    } catch (error) {
      logger.debug(`Database price fetch error for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Cache price in both Redis and memory
   * Supports both TokenPrice object and individual parameters for backward compatibility
   */
  private async cachePrice(tokenAddress: string, priceData: TokenPrice | number, source?: string): Promise<void> {
    let tokenPrice: TokenPrice;
    
    if (typeof priceData === 'number') {
      // Backward compatibility - construct TokenPrice from parameters
      tokenPrice = {
        address: tokenAddress,
        price: priceData,
        timestamp: Date.now(),
        source: (source as any) || 'unknown'
      };
    } else {
      // Use TokenPrice object directly
      tokenPrice = priceData;
    }

    // Cache in Redis (non-blocking)
    const cacheKey = CACHE_KEYS.TOKEN_PRICE + tokenAddress;
    cacheService.set(cacheKey, tokenPrice, { ttl: CACHE_TTL }).catch(error => {
      logger.debug(`Redis cache error for ${tokenAddress}:`, error);
    });

    // Cache in memory as fallback
    this.priceCache.set(tokenAddress, {
      price: tokenPrice.price,
      timestamp: tokenPrice.timestamp,
      source: tokenPrice.source,
    });
  }

  /**
   * Get cached price if fresh (memory fallback)
   */
  private getCachedPrice(tokenAddress: string): PriceCache | null {
    const cached = this.priceCache.get(tokenAddress);
    
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > MEMORY_CACHE_TTL) {
      this.priceCache.delete(tokenAddress);
      return null;
    }

    return cached;
  }

  /**
   * Split array into batches
   */
  private splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Rate limiting helper
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.priceCache.clear();
    logger.info('Price cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ address: string; age: number }> } {
    const entries = Array.from(this.priceCache.entries()).map(([address, cache]) => ({
      address,
      age: Date.now() - cache.timestamp,
    }));

    return {
      size: this.priceCache.size,
      entries,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const priceService = new PriceService();
