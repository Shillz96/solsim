/**
 * Singleton Redis Client
 *
 * CRITICAL FIX: Replaces 11+ separate Redis instances with single shared client
 *
 * Problem: Each service/worker created its own Redis connection, exhausting
 * Railway's connection limit (10-20 connections) before doing any work.
 *
 * Solution: Single Redis client shared across entire application via singleton pattern.
 *
 * Impact: 11 connections → 1 connection (90% reduction)
 */

import Redis from 'ioredis';
import { loggers } from '../utils/logger.js';

const logger = loggers.server;

let redisClient: Redis | null = null;

/**
 * Get singleton Redis client instance
 * Creates client on first call, returns same instance on subsequent calls
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || '';

    if (!redisUrl) {
      logger.error('REDIS_URL environment variable not set');
      throw new Error('REDIS_URL is required');
    }

    redisClient = new Redis(redisUrl, {
      // Connection settings
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true, // PERFORMANCE FIX: Enable queue to prevent cascading failures
      enableReadyCheck: true, // Wait for server to be ready before sending commands
      connectTimeout: 10000,
      // SCALING FIX: Keep connection alive to prevent timeouts under load
      keepAlive: 30000, // Send keepalive packets every 30 seconds
      connectionName: 'backend-workers', // Easier debugging in Redis logs

      // Retry strategy
      retryStrategy(times) {
        if (times > 3) {
          logger.error({ attempt: times }, 'Redis connection failed after 3 retries');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 500, 3000);
        logger.warn({ attempt: times, delay }, 'Redis connection retry');
        return delay;
      },

      // Reconnect on error
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        if (targetErrors.some(targetError => err.message.includes(targetError))) {
          logger.warn({ error: err.message }, 'Redis reconnecting on error');
          return true;
        }
        return false;
      }
    });

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('✅ Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error({ error: err.message }, '❌ Redis client error');
    });

    redisClient.on('close', () => {
      logger.warn('⚠️  Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });
  }

  return redisClient;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    logger.info('Closing Redis connection...');
    await redisClient.quit();
    redisClient = null;
    logger.info('✅ Redis connection closed');
  }
}

// Default export for convenience
export default getRedisClient;
