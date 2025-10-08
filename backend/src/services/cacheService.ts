import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

/**
 * Redis Cache Service
 * 
 * Provides distributed caching for price data and other frequently accessed information.
 * Features:
 * - Automatic connection management with reconnection
 * - TTL-based expiration
 * - JSON serialization/deserialization
 * - Error handling and fallback
 * - Memory-efficient batch operations
 * - Connection health monitoring
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  serialize?: boolean; // Whether to JSON serialize the value
}

export interface CacheStats {
  connected: boolean;
  totalKeys: number;
  memoryUsage: string;
  hitRate: number;
  errors: number;
}

export class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private stats = {
    hits: 0,
    misses: 0,
    errors: 0
  };

  constructor() {
    this.client = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 5000,
        keepAlive: true, // Enable keep-alive
        noDelay: true, // Disable Nagle's algorithm for lower latency
        reconnectStrategy: (retries) => {
          if (retries >= this.maxReconnectAttempts) {
            logger.error('Redis max reconnection attempts reached');
            return false;
          }
          const delay = Math.min(retries * 50, 2000);
          logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries + 1})`);
          return delay;
        }
      },
      // Optimize for performance and reliability
      readonly: false,
      // Increase command queue for better throughput
      commandsQueueMaxLength: 1000,
      // Keep offline queue for reliability (commands queued during reconnection)
      disableOfflineQueue: false
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.isConnected = false;
      this.stats.errors++;
    });

    this.client.on('end', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis client reconnecting (attempt ${this.reconnectAttempts})`);
    });
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
        logger.info('Redis cache service initialized');
      }
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      // Don't throw - allow app to continue without cache
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client.isReady;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isAvailable()) {
      this.stats.misses++;
      return null;
    }

    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      
      if (options.serialize !== false && typeof value === 'string') {
        return JSON.parse(value as string) as T;
      }
      
      return value as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serializedValue = options.serialize !== false 
        ? JSON.stringify(value) 
        : value;

      if (options.ttl) {
        await this.client.setEx(key, options.ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }

      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get multiple values efficiently
   */
  async mget<T>(keys: string[], options: CacheOptions = {}): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    if (!this.isAvailable() || keys.length === 0) {
      this.stats.misses += keys.length;
      return results;
    }

    try {
      const values = await this.client.mGet(keys);
      
      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        if (value !== null) {
          this.stats.hits++;
          const parsedValue = options.serialize !== false && typeof value === 'string'
            ? JSON.parse(value as string) as T 
            : value as T;
          results.set(keys[i], parsedValue);
        } else {
          this.stats.misses++;
        }
      }

      return results;
    } catch (error) {
      logger.error('Cache mget error:', error);
      this.stats.errors++;
      this.stats.misses += keys.length;
      return results;
    }
  }

  /**
   * Set multiple values efficiently
   */
  async mset(entries: Array<[string, any]>, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable() || entries.length === 0) {
      return false;
    }

    try {
      const serializedEntries: [string, string][] = entries.map(([key, value]) => [
        key,
        options.serialize !== false ? JSON.stringify(value) : String(value)
      ]);

      await this.client.mSet(serializedEntries as any);
      
      // Set TTL for each key if specified
      if (options.ttl) {
        const pipeline = this.client.multi();
        for (const [key] of entries) {
          pipeline.expire(key, options.ttl);
        }
        await pipeline.exec();
      }

      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.client.expire(key, seconds);
      return Boolean(result);
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Clear all cache keys matching pattern
   */
  async clear(pattern?: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      if (pattern) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          return await this.client.del(keys);
        }
        return 0;
      } else {
        await this.client.flushDb();
        return 1;
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;

    try {
      const info = this.isAvailable() ? await this.client.info('memory') : '';
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

      const dbsize = this.isAvailable() ? await this.client.dbSize() : 0;

      return {
        connected: this.isConnected,
        totalKeys: dbsize,
        memoryUsage,
        hitRate: Math.round(hitRate * 100) / 100,
        errors: this.stats.errors
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        connected: this.isConnected,
        totalKeys: 0,
        memoryUsage: 'Unknown',
        hitRate: Math.round(hitRate * 100) / 100,
        errors: this.stats.errors
      };
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    if (!this.isAvailable()) {
      return { 
        status: 'unhealthy', 
        error: 'Redis not connected' 
      };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return { 
        status: 'healthy', 
        latency 
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();
export default cacheService;