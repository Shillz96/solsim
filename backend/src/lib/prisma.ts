import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

/**
 * Enhanced Prisma Client with Optimized Connection Pooling
 * 
 * CONNECTION POOL OPTIMIZATIONS:
 * - Production: 20 connections with 20s pool timeout, 60s connect timeout
 * - Development: 10 connections with 10s pool timeout, 30s connect timeout
 * - pgBouncer compatible settings for production scalability
 * - Statement cache disabled for better memory efficiency
 * - Connection lifecycle management with health checks
 * 
 * PERFORMANCE TUNING:
 * - Larger pool in production for concurrent user load
 * - Longer connect timeout to handle network latency
 * - Pool timeout prevents connection exhaustion
 * - Prepared statements optimization via pgBouncer in transaction mode
 */

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Enhanced connection pool configuration optimized for scalability
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const prismaOptions: Prisma.PrismaClientOptions = {
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
    ...(isDevelopment 
      ? [{ emit: 'event' as const, level: 'info' as const }] 
      : []
    )
  ],
  errorFormat: 'minimal',
  
  // Optimized connection pooling for PostgreSQL
  // These parameters are appended to DATABASE_URL
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (isProduction
        // PRODUCTION: Aggressive pooling for high concurrency
        ? '?connection_limit=20' +           // Max 20 concurrent connections
          '&pool_timeout=20' +                // Wait 20s for available connection
          '&connect_timeout=60' +             // 60s to establish new connection
          '&statement_cache_size=0' +         // Disable for pgBouncer compatibility
          '&pgbouncer=true'                   // pgBouncer mode (if using)
        // DEVELOPMENT: Conservative pooling for local testing
        : '?connection_limit=10' +            // Max 10 connections
          '&pool_timeout=10' +                // Wait 10s for available connection
          '&connect_timeout=30' +             // 30s to establish new connection
          '&statement_cache_size=100'         // Enable cache for dev performance
      )
    }
  }
};

// Enhanced Prisma initialization with proper error handling
if (isProduction) {
  prisma = new PrismaClient(prismaOptions);
} else {
  // In development, use global variable to prevent multiple instances during hot reload
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(prismaOptions);
  }
  prisma = global.__prisma;
}

// Enhanced logging for Prisma events (TypeScript-safe)
try {
  // @ts-ignore - Prisma event types can be inconsistent
  prisma.$on('error', (e: any) => {
    logger.error('Prisma Error:', e);
  });

  // @ts-ignore - Prisma event types can be inconsistent
  prisma.$on('warn', (e: any) => {
    logger.warn('Prisma Warning:', e);
  });

  if (isDevelopment) {
    // @ts-ignore - Prisma event types can be inconsistent
    prisma.$on('info', (e: any) => {
      logger.info('Prisma Info:', e);
    });
  }
} catch (error) {
  // Event logging is optional - don't fail if not supported
  logger.debug('Prisma event logging not available:', error);
}

// Connection health check with retry logic and connection pool stats
export const checkDatabaseConnection = async (retries = 3): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      logger.info(`Database connection successful (${latency}ms)`);
      
      // Log connection pool stats in development
      if (process.env.NODE_ENV === 'development') {
        try {
          const poolStats = await getConnectionPoolStats();
          logger.info('Connection pool stats:', poolStats);
        } catch (error) {
          logger.debug('Could not get connection pool stats:', error);
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        throw new Error('Failed to connect to database after multiple attempts');
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  return false;
};

// Get connection pool statistics (PostgreSQL specific)
export const getConnectionPoolStats = async (): Promise<any> => {
  try {
    // This query works for PostgreSQL to get connection stats
    const stats = await prisma.$queryRaw`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    return stats;
  } catch (error) {
    // Fallback for SQLite or if the query fails
    return { 
      message: 'Connection pool stats not available for this database type',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Graceful shutdown helper
export const disconnectPrisma = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected');
  } catch (error) {
    logger.error('Error disconnecting Prisma client:', error);
  }
};

export { prisma };
export default prisma;