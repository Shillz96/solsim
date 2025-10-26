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
 * Parse bucket state from Redis
 */
function parseBucketState(data: string | null, now: number): BucketState {
  if (!data) {
    return { tokens: CHAT_MESSAGE_LIMIT.capacity, lastRefill: now };
  }

  try {
    const parsed = JSON.parse(data);
    return { tokens: parsed.tokens, lastRefill: parsed.lastRefill };
  } catch {
    return { tokens: CHAT_MESSAGE_LIMIT.capacity, lastRefill: now };
  }
}

/**
 * Calculate refilled tokens based on elapsed time
 */
function calculateRefill(bucket: BucketState, now: number, config: RateLimitConfig): number {
  const elapsed = now - bucket.lastRefill;
  const refillAmount = elapsed * config.refillRate;
  return Math.min(config.capacity, bucket.tokens + refillAmount);
}

/**
 * Calculate when bucket will have enough tokens
 */
function calculateResetTime(tokens: number, cost: number, refillRate: number, now: number): number {
  const tokensNeeded = Math.max(0, cost - tokens);
  const secondsUntilReset = tokensNeeded > 0 ? tokensNeeded / refillRate : 0;
  return Math.ceil(now + secondsUntilReset);
}

/**
 * Check rate limit using token bucket algorithm
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = CHAT_MESSAGE_LIMIT
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now() / 1000;

  try {
    const bucketData = await redis.get(key);
    const bucket = parseBucketState(bucketData, now);

    const tokens = calculateRefill(bucket, now, config);
    const allowed = tokens >= config.cost;
    const remaining = Math.floor(allowed ? tokens - config.cost : tokens);

    if (allowed) {
      await redis.setex(
        key,
        BUCKET_EXPIRY_SECONDS,
        JSON.stringify({ tokens: tokens - config.cost, lastRefill: now })
      );
    }

    const resetAt = calculateResetTime(tokens, config.cost, config.refillRate, now);

    return { allowed, remaining, resetAt };
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
 */
export async function isDuplicateMessage(
  messageHash: string,
  windowSeconds = 30
): Promise<boolean> {
  const redis = getRedis();
  const key = `chat:dedup:${messageHash}`;

  try {
    const exists = await redis.get(key);
    if (exists) return true;

    await redis.setex(key, windowSeconds, '1');
    return false;
  } catch (error) {
    console.error('Duplicate check failed:', error);
    return false; // Fail open
  }
}

/**
 * Get remaining quota for user
 */
export async function getRemainingQuota(userId: string): Promise<number> {
  const key = `chat:ratelimit:${userId}`;
  const result = await checkRateLimit(key, { ...CHAT_MESSAGE_LIMIT, cost: 0 });
  return result.remaining;
}

/**
 * Reset rate limit for user (admin function)
 */
export async function resetRateLimit(userId: string): Promise<void> {
  const redis = getRedis();
  const key = `chat:ratelimit:${userId}`;
  await redis.del(key);
}
