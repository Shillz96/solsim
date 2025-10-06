/**
 * Enhanced Caching Service
 * Provides in-memory caching with TTL, LRU eviction, and statistics
 */

import { LRUCache } from 'lru-cache';
import { logger } from '../utils/logger.js';

export interface CacheConfig {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  enableStats?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

export class CacheManager {
  private caches: Map<string, LRUCache<string, any>>;
  private stats: Map<string, CacheStats>;
  private defaultConfig: Required<CacheConfig>;

  constructor(defaultConfig?: CacheConfig) {
    this.caches = new Map();
    this.stats = new Map();
    this.defaultConfig = {
      maxSize: defaultConfig?.maxSize || 1000,
      ttl: defaultConfig?.ttl || 5 * 60 * 1000, // 5 minutes default
      enableStats: defaultConfig?.enableStats !== false,
    };
  }

  /**
   * Create or get a named cache
   */
  private getCache(namespace: string, config?: CacheConfig): LRUCache<string, any> {
    if (!this.caches.has(namespace)) {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const cache = new LRUCache<string, any>({
        max: mergedConfig.maxSize,
        ttl: mergedConfig.ttl,
        updateAgeOnGet: true,
        updateAgeOnHas: true,
      });

      this.caches.set(namespace, cache);
      this.stats.set(namespace, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0,
        hitRate: 0,
      });

      logger.info(`Cache namespace created: ${namespace}`, {
        maxSize: mergedConfig.maxSize,
        ttl: mergedConfig.ttl,
      });
    }

    return this.caches.get(namespace)!;
  }

  /**
   * Get stats for a namespace
   */
  private getStats(namespace: string): CacheStats {
    if (!this.stats.has(namespace)) {
      this.stats.set(namespace, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        size: 0,
        hitRate: 0,
      });
    }
    return this.stats.get(namespace)!;
  }

  /**
   * Update statistics
   */
  private updateStats(namespace: string, type: 'hit' | 'miss' | 'set' | 'delete'): void {
    if (!this.defaultConfig.enableStats) return;

    const stats = this.getStats(namespace);
    
    switch (type) {
      case 'hit':
        stats.hits++;
        break;
      case 'miss':
        stats.misses++;
        break;
      case 'set':
        stats.sets++;
        break;
      case 'delete':
        stats.deletes++;
        break;
    }

    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? stats.hits / total : 0;
    
    const cache = this.caches.get(namespace);
    stats.size = cache?.size || 0;
  }

  /**
   * Set a value in cache
   */
  set(namespace: string, key: string, value: any, ttl?: number): void {
    const cache = this.getCache(namespace);
    
    if (ttl !== undefined) {
      cache.set(key, value, { ttl });
    } else {
      cache.set(key, value);
    }

    this.updateStats(namespace, 'set');
  }

  /**
   * Get a value from cache
   */
  get<T = any>(namespace: string, key: string): T | undefined {
    const cache = this.getCache(namespace);
    const value = cache.get(key);

    if (value !== undefined) {
      this.updateStats(namespace, 'hit');
      return value as T;
    } else {
      this.updateStats(namespace, 'miss');
      return undefined;
    }
  }

  /**
   * Check if a key exists in cache
   */
  has(namespace: string, key: string): boolean {
    const cache = this.getCache(namespace);
    return cache.has(key);
  }

  /**
   * Delete a value from cache
   */
  delete(namespace: string, key: string): boolean {
    const cache = this.getCache(namespace);
    const deleted = cache.delete(key);
    
    if (deleted) {
      this.updateStats(namespace, 'delete');
    }
    
    return deleted;
  }

  /**
   * Clear a specific cache namespace
   */
  clear(namespace: string): void {
    const cache = this.caches.get(namespace);
    if (cache) {
      cache.clear();
      logger.info(`Cache namespace cleared: ${namespace}`);
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.forEach((cache, namespace) => {
      cache.clear();
      logger.info(`Cache namespace cleared: ${namespace}`);
    });
  }

  /**
   * Get statistics for a namespace
   */
  getStatistics(namespace: string): CacheStats {
    return { ...this.getStats(namespace) };
  }

  /**
   * Get statistics for all namespaces
   */
  getAllStatistics(): Record<string, CacheStats> {
    const allStats: Record<string, CacheStats> = {};
    this.stats.forEach((stats, namespace) => {
      allStats[namespace] = { ...stats };
    });
    return allStats;
  }

  /**
   * Get or set pattern (cache-aside pattern)
   */
  async getOrSet<T>(
    namespace: string,
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(namespace, key);
    
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(namespace, key, value, ttl);
    
    return value;
  }

  /**
   * Warm up cache with multiple values
   */
  warmup(namespace: string, entries: Array<{ key: string; value: any; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl }) => {
      this.set(namespace, key, value, ttl);
    });
    logger.info(`Cache warmed up: ${namespace} with ${entries.length} entries`);
  }

  /**
   * Get cache size
   */
  size(namespace: string): number {
    const cache = this.caches.get(namespace);
    return cache?.size || 0;
  }
}

// Singleton instance
export const cacheManager = new CacheManager({
  maxSize: 5000,
  ttl: 5 * 60 * 1000, // 5 minutes
  enableStats: true,
});

// Predefined cache namespaces with specific configurations
export const CacheNamespaces = {
  PRICES: 'prices', // Token prices - 30 seconds
  MARKET_DATA: 'market-data', // Market statistics - 2 minutes
  TRENDING: 'trending', // Trending tokens - 1 minute
  LEADERBOARD: 'leaderboard', // Leaderboard data - 30 seconds
  USER_PROFILES: 'user-profiles', // User profiles - 5 minutes
  TOKEN_METADATA: 'token-metadata', // Token metadata - 10 minutes
  PORTFOLIO: 'portfolio', // Portfolio data - 15 seconds
} as const;

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  PRICES: 30 * 1000, // 30 seconds
  MARKET_DATA: 2 * 60 * 1000, // 2 minutes
  TRENDING: 60 * 1000, // 1 minute
  LEADERBOARD: 30 * 1000, // 30 seconds
  USER_PROFILES: 5 * 60 * 1000, // 5 minutes
  TOKEN_METADATA: 10 * 60 * 1000, // 10 minutes
  PORTFOLIO: 15 * 1000, // 15 seconds
} as const;

// Export convenience functions for common operations
export const priceCache = {
  get: (key: string) => cacheManager.get(CacheNamespaces.PRICES, key),
  set: (key: string, value: any) => cacheManager.set(CacheNamespaces.PRICES, key, value, CacheTTL.PRICES),
  getOrSet: (key: string, fetcher: () => Promise<any>) => 
    cacheManager.getOrSet(CacheNamespaces.PRICES, key, fetcher, CacheTTL.PRICES),
};

export const marketCache = {
  get: (key: string) => cacheManager.get(CacheNamespaces.MARKET_DATA, key),
  set: (key: string, value: any) => cacheManager.set(CacheNamespaces.MARKET_DATA, key, value, CacheTTL.MARKET_DATA),
  getOrSet: (key: string, fetcher: () => Promise<any>) => 
    cacheManager.getOrSet(CacheNamespaces.MARKET_DATA, key, fetcher, CacheTTL.MARKET_DATA),
};

export const leaderboardCache = {
  get: (key: string) => cacheManager.get(CacheNamespaces.LEADERBOARD, key),
  set: (key: string, value: any) => cacheManager.set(CacheNamespaces.LEADERBOARD, key, value, CacheTTL.LEADERBOARD),
  clear: () => cacheManager.clear(CacheNamespaces.LEADERBOARD),
};

export default cacheManager;
