import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

// Redis store for distributed rate limiting (REQUIRED in production)
let RedisStore: any = null;
let redisClient: any = null;
const isProduction = process.env.NODE_ENV === 'production';

try {
  // Only import Redis store if Redis URL is available
  if (config.redis?.url) {
    const { default: RedisStoreClass } = await import('rate-limit-redis');
    const { createClient } = await import('redis');
    
    RedisStore = RedisStoreClass;
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
        connectTimeout: 5000,
      }
    });
    
    // Connect to Redis with error handling
    redisClient.connect().catch((error: any) => {
      const message = 'Failed to connect to Redis for rate limiting';
      
      if (isProduction) {
        // CRITICAL: In production, Redis is required for distributed rate limiting
        logger.error(`${message} - this is CRITICAL in production!`, { error });
        logger.error('Multiple instances will have independent rate limits without Redis!');
      } else {
        logger.warn(`${message}, falling back to memory store`, { error });
      }
      
      RedisStore = null;
      redisClient = null;
    });
    
    logger.info('Rate limiter configured with Redis store for distributed limiting');
  } else {
    const message = 'Redis not configured for rate limiting';
    
    if (isProduction) {
      // CRITICAL: Warn loudly in production
      logger.warn('⚠️  ' + message.toUpperCase() + ' ⚠️');
      logger.warn('⚠️  Rate limiting will NOT work correctly with multiple instances!');
      logger.warn('⚠️  Set REDIS_URL environment variable for distributed rate limiting.');
    } else {
      logger.info(`${message}, using memory store (OK for development)`);
    }
  }
} catch (error) {
  logger.warn('Redis store not available for rate limiting, using memory store', { error });
  
  if (isProduction) {
    logger.error('⚠️  PRODUCTION WARNING: Memory-based rate limiting with multiple instances!');
  }
}

// Helper function to create store configuration
function createStore() {
  if (RedisStore && redisClient) {
    try {
      return new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        // In production, be more strict about Redis failures
        // In development, allow graceful fallback
        passOnStoreError: !isProduction,
      });
    } catch (error) {
      logger.error('Failed to create Redis store for rate limiting', { error });
      
      if (isProduction) {
        logger.error('⚠️  Rate limiting may not work correctly across instances!');
      }
    }
  }
  
  // Log when falling back to memory store
  if (isProduction) {
    logger.warn('Using memory-based rate limiting - NOT suitable for multi-instance deployments!');
  }
  
  return undefined; // Use default memory store
}

// Extend Express Request type to include rateLimit
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime?: number;
      };
    }
  }
}

/**
 * Rate Limiter Middleware
 * 
 * Protects endpoints from brute-force attacks and abuse.
 * Following OWASP recommendations for API security.
 */

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs (allows for retries and testing)
  store: createStore(),
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: Math.ceil((req.rateLimit?.resetTime || Date.now() + 15 * 60 * 1000) / 1000),
    });
  },
});

// Moderate rate limiter for trade execution
export const tradeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Increased to 60 trades per minute to allow rapid trading
  store: createStore(),
  message: {
    success: false,
    error: 'Trading too quickly. Please slow down.',
    retryAfter: 60,
  },
  keyGenerator: (req: Request) => {
    // Use user ID from auth token for authenticated rate limiting
    const user = (req as any).user;
    return user?.id ? `trade:${user.id}` : `trade:ip:${req.ip}`;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const user = (req as any).user;
    logger.warn(`Trade rate limit exceeded for user ${user?.id || 'anonymous'}`, {
      userId: user?.id,
      ip: req.ip,
      endpoint: req.path
    });

    res.status(429).json({
      success: false,
      error: 'Trading too quickly. Please slow down.',
      retryAfter: 60,
      limit: 60,
      window: '1 minute'
    });
  },
});

// General API rate limiter with dynamic limits based on authentication
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  store: createStore(),
  limit: async (req: Request) => {
    // Higher limits for authenticated users to prevent legitimate usage issues
    const user = (req as any).user;
    if (user?.id) {
      return 1000; // 1000 requests per minute for authenticated users
    }
    return 300; // 300 requests per minute for unauthenticated users
  },
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    retryAfter: 60,
  },
  standardHeaders: 'draft-7', // Use draft-7 standard for better client handling
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID for authenticated requests, IP for unauthenticated
    const user = (req as any).user;
    return user?.id ? `user:${user.id}` : `ip:${req.ip || 'anonymous'}`;
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks and static assets
    const skipPaths = [
      '/api/v1/monitoring/health',
      '/favicon.ico',
      '/api/v1/auth/refresh' // Don't rate limit token refresh
    ];
    return skipPaths.some(path => req.path.startsWith(path));
  },
  handler: (req: Request, res: Response) => {
    const user = (req as any).user;
    const identifier = user?.id ? `user ${user.id}` : `IP ${req.ip}`;
    
    logger.warn(`Rate limit exceeded for ${identifier} on ${req.method} ${req.path}`, {
      userId: user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.path
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: 60,
      limit: user?.id ? 1000 : 300,
      window: '1 minute'
    });
  },
  // Enable request counting skip for failed requests to prevent abuse penalties
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

// Password reset rate limiter (very strict)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 attempts per hour
  store: createStore(),
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again in 1 hour.',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
