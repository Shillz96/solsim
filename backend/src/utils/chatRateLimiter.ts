/**
 * Chat Rate Limiter (Token Bucket Algorithm)
 *
 * Implements token bucket rate limiting using Redis:
 * - Message rate limiting (10 msgs / 15 seconds)
 * - Duplicate message detection (30 second window)
 * - Per-user and per-IP rate limits
 */

import { getRedis } from '../plugins/redis.js';

// Types
export interface RateLimitConfig {
  capacity: number;
  refillRate: number;
  cost: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface BucketState {
  tokens: number;
  lastRefill: number;
}

// Constants
const BUCKET_EXPIRY_SECONDS = 60;

export const CHAT_MESSAGE_LIMIT: RateLimitConfig = {
  capacity: 10,
  refillRate: 10 / 15, // 0.666 tokens per second
  cost: 1,
};

/**
 * Check rate limit using token bucket algorithm
 * @param key - Redis key (e.g., 'chat:ratelimit:userId')
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = CHAT_MESSAGE_LIMIT
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now() / 1000; // Unix timestamp in seconds

  try {
    // Get current bucket state
    const bucketData = await redis.get(key);
    let tokens: number;
    let lastRefill: number;

    if (bucketData) {
      const parsed = JSON.parse(bucketData);
      tokens = parsed.tokens;
      lastRefill = parsed.lastRefill;

      // Refill tokens based on time elapsed
      const elapsed = now - lastRefill;
      const refillAmount = elapsed * config.refillRate;
      tokens = Math.min(config.capacity, tokens + refillAmount);
    } else {
      // First request - full bucket
      tokens = config.capacity;
      lastRefill = now;
    }

    // Check if enough tokens available
    const allowed = tokens >= config.cost;
    const remaining = allowed ? Math.floor(tokens - config.cost) : Math.floor(tokens);

    if (allowed) {
      // Consume tokens
      tokens -= config.cost;
      lastRefill = now;

      // Save bucket state (expire in 60 seconds of inactivity)
      await redis.setex(
        key,
        60,
        JSON.stringify({ tokens, lastRefill })
      );
    }

    // Calculate reset time (when bucket will have 1 token)
    const tokensNeeded = config.cost - tokens;
    const secondsUntilReset = tokensNeeded > 0 ? tokensNeeded / config.refillRate : 0;
    const resetAt = Math.ceil(now + secondsUntilReset);

    return {
      allowed,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: config.capacity,
      resetAt: Math.floor(now) + 15,
    };
  }
}

/**
 * Check for duplicate messages (spam detection)
 * @param messageHash - Hash of message content + userId
 * @param windowSeconds - Deduplication window in seconds (default 30s)
 * @returns true if message is duplicate
 */
export async function isDuplicateMessage(
  messageHash: string,
  windowSeconds: number = 30
): Promise<boolean> {
  const redis = getRedis();
  const key = `chat:dedup:${messageHash}`;

  try {
    const exists = await redis.get(key);
    if (exists) {
      return true; // Duplicate found
    }

    // Mark message as seen
    await redis.setex(key, windowSeconds, '1');
    return false;
  } catch (error) {
    console.error('Duplicate check failed:', error);
    return false; // Fail open
  }
}

/**
 * Get remaining quota for user
 * @param userId - User ID
 * @returns Remaining message quota
 */
export async function getRemainingQuota(userId: string): Promise<number> {
  const key = `chat:ratelimit:${userId}`;
  const result = await checkRateLimit(key, { ...CHAT_MESSAGE_LIMIT, cost: 0 });
  return result.remaining;
}

/**
 * Reset rate limit for user (admin function)
 * @param userId - User ID
 */
export async function resetRateLimit(userId: string): Promise<void> {
  const redis = getRedis();
  const key = `chat:ratelimit:${userId}`;
  await redis.del(key);
}
