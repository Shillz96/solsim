// Production-ready rate limiting with tiered limits and Redis backing
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import redis from './redis.js';
const config = {
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300'),
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1m'
};

interface RateLimitOptions {
  max: number;
  window: string; // e.g., '1m', '15m', '1h'
  keyGenerator?: (req: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Define rate limit tiers
const rateLimitTiers = {
  // Public endpoints (strictest)
  public: {
    max: 30,
    window: '1m'
  },
  // Authentication endpoints
  auth: {
    max: 5,
    window: '15m'
  },
  // Wallet operations
  wallet: {
    max: 10,
    window: '1m'
  },
  // Trading endpoints (most important to protect)
  trading: {
    max: 60,
    window: '1m'
  },
  // Price/data endpoints (can be hit frequently)
  data: {
    max: 120,
    window: '1m'
  },
  // Admin endpoints
  admin: {
    max: 100,
    window: '1m'
  },
  // Global limit per IP
  global: {
    max: config.rateLimitMaxRequests || 300,
    window: config.rateLimitWindow || '1m'
  }
};

// Convert window string to seconds
function windowToSeconds(window: string): number {
  const match = window.match(/^(\d+)([smh])$/);
  if (!match) return 60; // Default to 1 minute

  const [, value, unit] = match;
  const multipliers = { s: 1, m: 60, h: 3600 };
  return parseInt(value) * multipliers[unit as 's' | 'm' | 'h'];
}

// Custom Redis-based rate limiter for production scale
class RedisRateLimiter {
  async checkLimit(key: string, options: RateLimitOptions): Promise<{
    allowed: boolean;
    count: number;
    remaining: number;
    resetTime: number;
  }> {
    const windowSeconds = windowToSeconds(options.window);
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    // Use Redis sorted set for sliding window rate limiting
    const multi = redis.multi();

    // Remove old entries
    multi.zremrangebyscore(key, '-inf', windowStart);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Count requests in window
    multi.zcard(key);

    // Set expiry
    multi.expire(key, windowSeconds + 1);

    const results = await multi.exec();

    if (!results) {
      // Redis error, allow request but log warning
      console.warn('Rate limiter Redis error, allowing request');
      return {
        allowed: true,
        count: 0,
        remaining: options.max,
        resetTime: now + windowSeconds * 1000
      };
    }

    const count = results[2][1] as number;
    const allowed = count <= options.max;

    // If not allowed, remove the request we just added
    if (!allowed) {
      await redis.zrem(key, `${now}-${Math.random()}`);
    }

    return {
      allowed,
      count: Math.min(count, options.max),
      remaining: Math.max(0, options.max - count),
      resetTime: now + windowSeconds * 1000
    };
  }
}

const limiter = new RedisRateLimiter();

// Create rate limit middleware
function createRateLimitMiddleware(tier: keyof typeof rateLimitTiers, customOptions?: Partial<RateLimitOptions>) {
  const options: RateLimitOptions = {
    ...rateLimitTiers[tier],
    ...customOptions
  };

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Generate rate limit key
    const keyGenerator = options.keyGenerator || ((req: FastifyRequest) => {
      // Use user ID if authenticated, otherwise use IP
      // @ts-ignore
      const userId = req.user?.id;
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      return userId ? `user:${userId}` : `ip:${ip}`;
    });

    const identifier = keyGenerator(request);
    const key = `ratelimit:${tier}:${identifier}`;

    try {
      const result = await limiter.checkLimit(key, options);

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', options.max);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (!result.allowed) {
        // Log rate limit violations
        console.warn(`Rate limit exceeded: ${tier} for ${identifier}`, {
          requestId: request.requestId,
          endpoint: `${request.method} ${request.url}`,
          count: result.count,
          max: options.max
        });

        return reply.code(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please slow down',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          limit: options.max,
          window: options.window
        });
      }
    } catch (error) {
      // Log error but don't block request if rate limiter fails
      console.error('Rate limiter error:', error);
    }

    return;
  };
}

// Global rate limiter to prevent DDoS
async function globalRateLimit(request: FastifyRequest, reply: FastifyReply) {
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  const key = `ratelimit:global:ip:${ip}`;

  try {
    const result = await limiter.checkLimit(key, rateLimitTiers.global);

    if (!result.allowed) {
      console.error(`🚨 Global rate limit exceeded for IP: ${ip}`, {
        requestId: request.requestId,
        count: result.count
      });

      return reply.code(429).send({
        error: 'GLOBAL_RATE_LIMIT',
        message: 'Too many requests from your IP address',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
    }
  } catch (error) {
    console.error('Global rate limiter error:', error);
  }

  return;
}

// Export configured rate limiters
export const productionRateLimits = {
  auth: createRateLimitMiddleware('auth'),
  wallet: createRateLimitMiddleware('wallet'),
  trading: createRateLimitMiddleware('trading'),
  data: createRateLimitMiddleware('data'),
  admin: createRateLimitMiddleware('admin'),
  public: createRateLimitMiddleware('public'),
  global: globalRateLimit,

  // Custom rate limiter for specific needs
  custom: (options: RateLimitOptions) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const middleware = createRateLimitMiddleware('public', options);
      return middleware(request, reply);
    };
  }
};

// Plugin to apply global rate limiting
export default async function productionRateLimitingPlugin(app: FastifyInstance) {
  // Apply global rate limit to all routes
  app.addHook('onRequest', globalRateLimit);

  // Monitor rate limit violations
  let violationCount = 0;
  let violationsByIp = new Map<string, number>();

  app.addHook('onResponse', async (request, reply) => {
    if (reply.statusCode === 429) {
      violationCount++;
      const ip = request.ip || 'unknown';
      violationsByIp.set(ip, (violationsByIp.get(ip) || 0) + 1);

      // Alert if too many violations from single IP
      if (violationsByIp.get(ip)! > 100) {
        console.error(`🚨 ALERT: Potential DDoS from IP ${ip} - ${violationsByIp.get(ip)} violations`);
      }
    }
  });

  // Metrics endpoint for rate limiting
  app.get('/metrics/rate-limits', async (request, reply) => {
    const topViolators = Array.from(violationsByIp.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, violations: count }));

    return {
      totalViolations: violationCount,
      topViolators,
      limits: rateLimitTiers
    };
  });

  console.log('✅ Production rate limiting initialized with Redis backing');
}