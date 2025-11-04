/**
 * Dedicated Prisma Client for Authentication
 *
 * CRITICAL FIX: Separate connection pool for auth to prevent blocking
 *
 * Problem: Auth queries were timing out when token discovery consumed all connections
 * Solution: Dedicated 5-connection pool exclusively for auth operations
 *
 * Railway Postgres Starter Total: 20 connections
 * - Auth Pool (this file): 5 connections (25%)
 * - Backend Pool (prisma.ts): 7 connections (35%)
 * - Worker Pool (worker config): 8 connections (40%)
 */

import { PrismaClient } from "@prisma/client";

const globalForAuthPrisma = globalThis as unknown as {
  authPrisma: PrismaClient | undefined;
};

// Auth-specific connection pool configuration
const getAuthConnectionPoolConfig = () => {
  const isProduction = process.env.NODE_ENV === "production";

  // EMERGENCY FIX: Prioritize auth connections to prevent signup failures
  const authLimit = parseInt(process.env.AUTH_DB_CONNECTION_LIMIT || '10');

  if (isProduction) {
    return {
      connection_limit: authLimit,     // Increased from 5 → 10 (env configurable)
      pool_timeout: 10,                // Fast timeout (auth should be quick)
      statement_cache_size: 200        // Smaller cache (fewer query patterns)
    };
  }

  return {
    connection_limit: 3,           // Dev: 3 connections
    pool_timeout: 10,
    statement_cache_size: 50
  };
};

// Enhance DATABASE_URL with auth-specific pooling parameters
const getAuthDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return baseUrl;

  const config = getAuthConnectionPoolConfig();
  const url = new URL(baseUrl);

  // Add connection pool parameters
  url.searchParams.set('connection_limit', config.connection_limit.toString());
  url.searchParams.set('pool_timeout', config.pool_timeout.toString());
  url.searchParams.set('statement_cache_size', config.statement_cache_size.toString());

  // Add pool name to distinguish in logs
  url.searchParams.set('application_name', 'auth-pool');

  return url.toString();
};

const authPrisma = globalForAuthPrisma.authPrisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getAuthDatabaseUrl()
    }
  },
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForAuthPrisma.authPrisma = authPrisma;

// Connection monitoring for auth pool
let authActiveConnections = 0;
let authPeakConnections = 0;
let authTotalQueries = 0;

authPrisma.$use(async (params, next) => {
  authActiveConnections++;
  authPeakConnections = Math.max(authPeakConnections, authActiveConnections);
  authTotalQueries++;

  const startTime = Date.now();
  const config = getAuthConnectionPoolConfig();
  const utilization = authActiveConnections / config.connection_limit;

  // Warn if auth pool is under pressure (shouldn't happen often)
  if (utilization > 0.8) {
    console.error({
      level: 'CRITICAL',
      pool: 'AUTH',
      active: authActiveConnections,
      limit: config.connection_limit,
      utilization: `${(utilization * 100).toFixed(0)}%`,
      model: params.model,
      action: params.action,
      warning: '⚠️ AUTH POOL EXHAUSTED - Investigate unusual auth traffic'
    }, '🚨 CRITICAL AUTH POOL ALERT');
  } else if (utilization > 0.6) {
    console.warn({
      pool: 'AUTH',
      active: authActiveConnections,
      limit: config.connection_limit,
      utilization: `${(utilization * 100).toFixed(0)}%`,
      model: params.model,
      action: params.action
    }, '⚠️ High auth pool usage');
  }

  try {
    const result = await next(params);
    const duration = Date.now() - startTime;

    // Auth queries should be fast - warn if >200ms
    if (duration > 200) {
      console.warn({
        pool: 'AUTH',
        model: params.model,
        action: params.action,
        duration: `${duration}ms`,
        warning: 'Auth query slower than expected'
      }, '🐌 Slow auth query');
    }

    return result;
  } finally {
    authActiveConnections--;
  }
});

// Graceful shutdown
const shutdownAuth = async () => {
  console.log('🔌 Disconnecting Auth Prisma...');
  await authPrisma.$disconnect();
};

process.on("beforeExit", shutdownAuth);
process.on("SIGTERM", shutdownAuth);
process.on("SIGINT", shutdownAuth);

// Export connection stats for monitoring
export function getAuthConnectionStats() {
  const config = getAuthConnectionPoolConfig();
  return {
    pool: 'AUTH',
    active: authActiveConnections,
    peak: authPeakConnections,
    limit: config.connection_limit,
    peakUtilization: ((authPeakConnections / config.connection_limit) * 100).toFixed(1) + '%',
    currentUtilization: ((authActiveConnections / config.connection_limit) * 100).toFixed(1) + '%',
    totalQueries: authTotalQueries
  };
}

console.log('✅ Auth Prisma initialized with dedicated connection pool:', getAuthConnectionPoolConfig());

export default authPrisma;
