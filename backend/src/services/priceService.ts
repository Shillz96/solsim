import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import prisma from '../lib/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import { cacheService } from './cacheService.js';
import { monitoringService, trackPriceUpdate, trackCacheOperation } from './monitoringService.js';
import { circuitBreakerManager } from '../utils/circuitBreaker.js';

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
  priceSol?: number; // SOL per token (new: native SOL pricing)
  priceChange24h?: number;
  volume24h?: number;
  liquidity?: number;
  marketCap?: number;
  timestamp: number;
  source: 'dexscreener' | 'birdeye' | 'coingecko' | 'database';
  pairInfo?: {
    dexId: string;
    pairAddress: string;
    baseToken: string;
    quoteToken: string;
    liquidityScore: number; // Combined liquidity/volume score for pair selection
  };
}

export interface PriceCache {
  price: number;
  priceSol?: number; // Cache SOL price too
  timestamp: number;
  source: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL = 30; // 30 seconds Redis TTL
const MEMORY_CACHE_TTL = 10 * 1000; // 10 seconds in-memory fallback
const NEGATIVE_CACHE_TTL = 5 * 60; // 5 minutes for failed lookups (negative caching)
const BATCH_SIZE = 50; // Max tokens per batch request
const REQUEST_TIMEOUT = 5000; // 5 second timeout
const RATE_LIMIT_DELAY = 100; // 100ms between requests

// Cache key prefixes
const CACHE_KEYS = {
  TOKEN_PRICE: 'price:token:',
  SOL_PRICE: 'price:sol',
  BATCH_PRICES: 'price:batch:',
  NEGATIVE: 'price:negative:', // For failed lookups
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
  
  // Cache stampede protection: track in-flight requests
  private inflightRequests: Map<string, Promise<TokenPrice | null>> = new Map();
  
  // Batch request coalescing: track in-flight batch requests
  // Key is sorted comma-separated addresses to match identical batch requests
  private inflightBatchRequests: Map<string, Promise<Map<string, TokenPrice>>> = new Map();
  
  // Circuit breakers for external APIs
  private dexScreenerBreaker = circuitBreakerManager.getBreaker('dexscreener', {
    failureThreshold: 5,
    timeout: 30000, // 30 seconds
    successThreshold: 2
  });
  
  private birdeyeBreaker = circuitBreakerManager.getBreaker('birdeye', {
    failureThreshold: 3,
    timeout: 60000, // 1 minute
    successThreshold: 2
  });
  
  private coinGeckoBreaker = circuitBreakerManager.getBreaker('coingecko', {
    failureThreshold: 3,
    timeout: 60000, // 1 minute
    successThreshold: 2
  });

  /**
   * Get current price for a single token in SOL
   * Returns price in SOL units for native Solana trading
   */
  async getPriceSol(tokenAddress: string): Promise<number | null> {
    const tokenPrice = await this.getPrice(tokenAddress);
    if (!tokenPrice) return null;
    
    // Return native SOL price if available
    if (tokenPrice.priceSol !== undefined) {
      return tokenPrice.priceSol;
    }
    
    // Convert USD to SOL if needed
    const solPrice = await this.getSolPrice();
    if (solPrice > 0 && tokenPrice.price > 0) {
      return tokenPrice.price / solPrice;
    }
    
    return null;
  }

  /**
   * Get combined price data (USD and SOL) for a single token
   * More efficient than calling getPrice and getPriceSol separately
   */
  async getTokenPrices(tokenAddress: string): Promise<{
    price: number;
    priceSol: number;
    marketCap?: number;
  } | null> {
    try {
      const [tokenPrice, solPrice] = await Promise.all([
        this.getPrice(tokenAddress),
        this.getSolPrice()
      ]);

      if (!tokenPrice) {
        return null;
      }

      const priceSol = tokenPrice.price / solPrice;

      return {
        price: tokenPrice.price,
        priceSol,
        marketCap: tokenPrice.marketCap
      };
    } catch (error) {
      logger.error(`Error getting combined token prices for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Get current price for a single token
   * Uses Redis caching with memory fallback
   * Implements cache stampede protection to prevent duplicate external API calls
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

      // 3. Cache stampede protection: Check if request already in-flight
      const inflightRequest = this.inflightRequests.get(tokenAddress);
      if (inflightRequest) {
        logger.debug(`Price request already in-flight, waiting: ${tokenAddress}`);
        return await inflightRequest;
      }

      // 4. Create new request and track it
      const requestPromise = this.fetchAndCachePrice(tokenAddress);
      this.inflightRequests.set(tokenAddress, requestPromise);

      try {
        const price = await requestPromise;
        return price;
      } finally {
        // Clean up in-flight tracker
        this.inflightRequests.delete(tokenAddress);
      }
    } catch (error) {
      logger.error(`Error getting price for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Fetch price from external APIs and cache the result
   * Separated for cache stampede protection
   */
  private async fetchAndCachePrice(tokenAddress: string): Promise<TokenPrice | null> {
    try {
      // Check negative cache first (failed lookups)
      const negativeCacheKey = CACHE_KEYS.NEGATIVE + tokenAddress;
      const isNegativelyCached = await cacheService.exists(negativeCacheKey);
      
      if (isNegativelyCached) {
        logger.debug(`Token in negative cache (previously failed): ${tokenAddress}`);
        return null; // Don't retry failed lookups for 5 minutes
      }
      
      const price = await this.fetchPriceWithFallback(tokenAddress);
      
      if (price) {
        // Cache in both Redis and memory
        await this.cachePrice(tokenAddress, price);
        trackPriceUpdate(price.source, 'success');
      } else {
        // Negative caching: cache failures for 5 minutes to prevent hammering
        // This prevents repeated expensive API calls for non-existent or delisted tokens
        await cacheService.set(negativeCacheKey, { failed: true, timestamp: Date.now() }, { 
          ttl: NEGATIVE_CACHE_TTL,
          serialize: true 
        });
        trackPriceUpdate('unknown', 'error');
        logger.debug(`Negative caching failed price lookup: ${tokenAddress} (cached for ${NEGATIVE_CACHE_TTL}s)`);
      }

      return price;
    } catch (error) {
      logger.error(`Error fetching price for ${tokenAddress}:`, error);
      
      // Also negative cache errors to prevent retry storms
      const negativeCacheKey = CACHE_KEYS.NEGATIVE + tokenAddress;
      await cacheService.set(negativeCacheKey, { error: true, timestamp: Date.now() }, { 
        ttl: NEGATIVE_CACHE_TTL,
        serialize: true 
      });
      
      return null;
    }
  }

  /**
   * Get prices for multiple tokens efficiently
   * Uses Redis batch operations and request coalescing for optimal performance
   * Implements request coalescing to prevent duplicate batch fetches
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

      // 3. Fetch uncached tokens with request coalescing
      if (uncachedTokens.length > 0) {
        logger.debug(`Fetching ${uncachedTokens.length} uncached prices`);
        
        // Create batch key for request coalescing (sorted to match identical requests)
        const batchKey = [...uncachedTokens].sort().join(',');
        
        // Check if this exact batch is already being fetched
        const inflightBatch = this.inflightBatchRequests.get(batchKey);
        if (inflightBatch) {
          logger.debug(`Batch request already in-flight, waiting for ${uncachedTokens.length} tokens`);
          const batchResults = await inflightBatch;
          batchResults.forEach((price, address) => {
            if (uncachedTokens.includes(address)) {
              results.set(address, price);
            }
          });
          return results;
        }
        
        // Create new batch request and track it
        const batchPromise = this.fetchBatchPricesWithCoalescing(uncachedTokens);
        this.inflightBatchRequests.set(batchKey, batchPromise);
        
        try {
          const batchResults = await batchPromise;
          batchResults.forEach((price, address) => {
            results.set(address, price);
          });
        } finally {
          // Clean up in-flight tracker
          this.inflightBatchRequests.delete(batchKey);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error getting batch prices:', error);
      return results;
    }
  }

  /**
   * Fetch batch prices with proper caching and timeout protection
   * Separated for request coalescing
   */
  private async fetchBatchPricesWithCoalescing(tokenAddresses: string[]): Promise<Map<string, TokenPrice>> {
    const results = new Map<string, TokenPrice>();
    
    // Add timeout protection - don't let batch fetches hang
    const BATCH_FETCH_TIMEOUT = 5000; // 5 seconds max for batch
    
    try {
      const batches = this.splitIntoBatches(tokenAddresses, BATCH_SIZE);

      // Wrap the batch processing in a timeout
      await Promise.race([
        (async () => {
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
              await cacheService.mset(cacheEntries, { ttl: CACHE_TTL, serialize: true });
            }

            // Rate limiting between batches
            await this.waitForRateLimit();
          }
        })(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Batch fetch timeout')), BATCH_FETCH_TIMEOUT)
        )
      ]);

      return results;
    } catch (error) {
      logger.error('Error fetching batch prices:', error);
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
   * Fetch price from DexScreener API with SOL-native pricing priority
   * 
   * Priority:
   * 1. Direct SOL pairs (most accurate for Solana ecosystem)
   * 2. USDC/USDT pairs with SOL conversion
   * 3. Any other pairs
   * 
   * Pairs are scored by liquidity, volume, and recent activity
   */
  private async fetchDexScreenerPrice(tokenAddress: string): Promise<TokenPrice | null> {
    // Wrap with circuit breaker - only catches real API failures
    return this.dexScreenerBreaker.execute(async () => {
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
        // Only throw for server errors (500+), not for 404 (token not found)
        if (response.status >= 500) {
          throw new Error(`DexScreener API error: ${response.status}`);
        }
        logger.debug(`DexScreener API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) {
        return null;
      }

      // Filter Solana pairs only
      const solanaPairs = data.pairs.filter((p: any) => p.chainId === 'solana');
      if (solanaPairs.length === 0) {
        return null;
      }

      // Categorize pairs by quote token
      const solPairs = solanaPairs.filter((p: any) => 
        p.quoteToken?.symbol === 'SOL' || 
        p.quoteToken?.address === SOL_ADDRESSES.WRAPPED
      );
      
      const stablePairs = solanaPairs.filter((p: any) => 
        ['USDC', 'USDT', 'UST'].includes(p.quoteToken?.symbol)
      );

      // Score and select best pair
      const scorePair = (pair: any) => {
        const liquidity = pair.liquidity?.usd || 0;
        const volume24h = pair.volume?.h24 || 0;
        const volume5m = pair.volume?.m5 || 0;
        const txCount = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
        
        // Weighted score: 50% liquidity, 30% 24h volume, 10% recent volume, 10% tx count
        return liquidity * 0.5 + volume24h * 0.3 + volume5m * 100 * 0.1 + txCount * 10 * 0.1;
      };

      // Prefer SOL pairs for native pricing
      let selectedPair = null;
      let priceSol = null;
      let priceUsd = null;

      if (solPairs.length > 0) {
        // Use best SOL pair
        selectedPair = solPairs.sort((a: any, b: any) => scorePair(b) - scorePair(a))[0];
        priceSol = parseFloat(selectedPair.priceNative || '0');
        priceUsd = parseFloat(selectedPair.priceUsd || '0');
        
        logger.debug(`Using SOL pair for ${tokenAddress}: ${priceSol} SOL`);
      } else if (stablePairs.length > 0) {
        // Use best stable pair
        selectedPair = stablePairs.sort((a: any, b: any) => scorePair(b) - scorePair(a))[0];
        priceUsd = parseFloat(selectedPair.priceUsd || '0');
        
        // Convert USD to SOL if we have SOL price
        const solPrice = await this.getSolPrice();
        if (solPrice > 0) {
          priceSol = priceUsd / solPrice;
        }
        
        logger.debug(`Using stable pair for ${tokenAddress}: $${priceUsd}`);
      } else {
        // Use any pair with highest score
        selectedPair = solanaPairs.sort((a: any, b: any) => scorePair(b) - scorePair(a))[0];
        priceUsd = parseFloat(selectedPair.priceUsd || '0');
        
        logger.debug(`Using fallback pair for ${tokenAddress}`);
      }

      if (!selectedPair || (!priceUsd && !priceSol)) {
        return null;
      }

      // Ensure we have both prices
      if (!priceUsd && priceSol) {
        const solPrice = await this.getSolPrice();
        priceUsd = priceSol * solPrice;
      }
      if (!priceSol && priceUsd) {
        const solPrice = await this.getSolPrice();
        if (solPrice > 0) {
          priceSol = priceUsd / solPrice;
        }
      }

      return {
        address: tokenAddress,
        price: priceUsd || 0,
        priceSol: priceSol || undefined,
        priceChange24h: selectedPair.priceChange?.h24 ? parseFloat(selectedPair.priceChange.h24) : undefined,
        volume24h: selectedPair.volume?.h24 ? parseFloat(selectedPair.volume.h24) : undefined,
        liquidity: selectedPair.liquidity?.usd ? parseFloat(selectedPair.liquidity.usd) : undefined,
        marketCap: selectedPair.marketCap ? parseFloat(selectedPair.marketCap) : undefined,
        timestamp: Date.now(),
        source: 'dexscreener',
        pairInfo: {
          dexId: selectedPair.dexId,
          pairAddress: selectedPair.pairAddress,
          baseToken: selectedPair.baseToken?.symbol,
          quoteToken: selectedPair.quoteToken?.symbol,
          liquidityScore: scorePair(selectedPair),
        },
      };
    }, null); // null fallback - will try other sources
  }

  /**
   * Fetch price from Birdeye API
   */
  private async fetchBirdeyePrice(tokenAddress: string): Promise<TokenPrice | null> {
    if (!config.apis.birdeye.apiKey) {
      return null;
    }

    // Wrap with circuit breaker
    return this.birdeyeBreaker.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(
        `${config.apis.birdeye.baseUrl}/defi/price?address=${tokenAddress}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'X-API-KEY': config.apis.birdeye.apiKey!,
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Only throw for server errors (500+), not for 404 (token not found)
        if (response.status >= 500) {
          throw new Error(`Birdeye API error: ${response.status}`);
        }
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
    }, null); // null fallback
  }

  /**
   * Fetch price from CoinGecko API (for major tokens like SOL)
   */
  private async fetchCoinGeckoPrice(coinId: string): Promise<TokenPrice | null> {
    // Wrap with circuit breaker
    return this.coinGeckoBreaker.execute(async () => {
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
        // Only throw for server errors (500+), not for 404 (token not found)
        if (response.status >= 500) {
          throw new Error(`CoinGecko API error: ${response.status}`);
        }
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
    }, null); // null fallback
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
      priceSol: tokenPrice.priceSol, // Cache SOL price too
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
