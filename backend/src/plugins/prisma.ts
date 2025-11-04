// Prisma client singleton with connection pooling for production scale
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Calculate optimal connection pool based on environment
// Railway Pro: 32 vCPU + 32 GB RAM (UPGRADED!)
// Connection pool optimized for high-performance workload
// Total connections depend on Postgres plan - using env vars for flexibility
const getConnectionPoolConfig = () => {
  const isProduction = process.env.NODE_ENV === "production";

  // RAILWAY PRO OPTIMIZATION (32vCPU/32GB)
  const backendLimit = parseInt(process.env.BACKEND_DB_CONNECTION_LIMIT || '25');

  if (isProduction) {
    return {
      connection_limit: backendLimit,  // 25 connections for 32vCPU/32GB instance
      pool_timeout: 60,                // 60s wait time for connection from pool
      statement_cache_size: 3000,      // Increased cache for 32GB RAM
      connect_timeout: 15,             // 15s timeout for initial connection (increased from 10)
      socket_timeout: 60,              // 60s socket timeout to prevent stale connections
      idle_in_transaction_session_timeout: 30000  // 30s to kill idle transactions (milliseconds)
    };
  }

  return {
    connection_limit: 4,           // Dev: keep low
    pool_timeout: 30,
    statement_cache_size: 100
  };
};

// Enhance DATABASE_URL with pooling parameters
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return baseUrl;

  const config = getConnectionPoolConfig();
  const url = new URL(baseUrl);

  // Add connection pool parameters
  url.searchParams.set('connection_limit', config.connection_limit.toString());
  url.searchParams.set('pool_timeout', config.pool_timeout.toString());
  url.searchParams.set('statement_cache_size', config.statement_cache_size.toString());

  // Add connection timeout and socket settings
  if (config.connect_timeout) {
    url.searchParams.set('connect_timeout', config.connect_timeout.toString());
  }
  if (config.socket_timeout) {
    url.searchParams.set('socket_timeout', config.socket_timeout.toString());
  }
  if (config.idle_in_transaction_session_timeout) {
    url.searchParams.set('idle_in_transaction_session_timeout', config.idle_in_transaction_session_timeout.toString());
  }

  // PostgreSQL-specific settings for connection stability
  url.searchParams.set('pgbouncer', 'true');  // Enable connection pooling
  url.searchParams.set('schema', 'public');

  return url.toString();
};

// Connection monitoring variables (module-level to persist across queries)
let activeConnections = 0;
let peakConnections = 0;
let totalQueries = 0;
let slowQueries = 0;

// Create Prisma client with connection retry and monitoring logic
const createPrismaClient = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"], // Removed "query" to reduce log noise
  });

  // Add retry logic + monitoring using Prisma Client Extensions
  return client.$extends({
    name: 'connectionRetryAndMonitoring',
    query: {
      async $allOperations({ args, query, operation, model }) {
        // Start monitoring
        activeConnections++;
        peakConnections = Math.max(peakConnections, activeConnections);
        totalQueries++;

        const startTime = Date.now();
        const config = getConnectionPoolConfig();
        const utilization = activeConnections / config.connection_limit;

        // Enhanced logging with query context during high load
        if (utilization > 0.8) {
          const errorData = {
            level: 'CRITICAL',
            active: activeConnections,
            limit: config.connection_limit,
            utilization: `${(utilization * 100).toFixed(0)}%`,
            model: model,
            action: operation,
            warning: '⚠️ AUTH QUERIES MAY BE BLOCKED - Database overload detected'
          };
          console.error('🚨 CRITICAL DB CONNECTION ALERT:', JSON.stringify(errorData));
        } else if (utilization > 0.6) {
          const warnData = {
            active: activeConnections,
            limit: config.connection_limit,
            utilization: `${(utilization * 100).toFixed(0)}%`,
            model: model,
            action: operation
          };
          console.warn('⚠️ High DB connection usage:', JSON.stringify(warnData));
        }

        // Retry logic
        const maxRetries = 3;
        let lastError: any;

        try {
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              const result = await query(args);

              // Track query duration after successful execution
              const duration = Date.now() - startTime;

              // Track slow queries (>500ms)
              if (duration > 500) {
                slowQueries++;
                console.warn({
                  model: model,
                  action: operation,
                  duration: `${duration}ms`,
                  connectionUtilization: `${(utilization * 100).toFixed(0)}%`
                }, '🐌 Slow query detected');
              }

              return result;
            } catch (error: any) {
              lastError = error;

              // Retry on connection errors
              const isConnectionError =
                error.code === 'P1001' || // Can't reach database server
                error.code === 'P1002' || // Database server timeout
                error.code === 'P1008' || // Operations timed out
                error.message?.includes('Connection reset') ||
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('Connection terminated unexpectedly');

              if (isConnectionError && attempt < maxRetries - 1) {
                const backoff = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5s backoff
                console.warn(`[Prisma] Connection error on ${model}.${operation}, retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`, {
                  errorCode: error.code,
                  errorMessage: error.message?.substring(0, 100)
                });
                await new Promise(resolve => setTimeout(resolve, backoff));
                continue;
              }

              // Don't retry other errors or final attempt
              throw error;
            }
          }

          throw lastError;
        } finally {
          // Always decrement active connections, even on error
          activeConnections--;
        }
      }
    }
  }) as any; // Type assertion to maintain PrismaClient type compatibility
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown
const shutdown = async () => {
  console.log('🔌 Disconnecting Prisma...');
  await prisma.$disconnect();
};

process.on("beforeExit", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Export connection stats for monitoring
export function getConnectionStats() {
  const config = getConnectionPoolConfig();
  return {
    active: activeConnections,
    peak: peakConnections,
    limit: config.connection_limit,
    peakUtilization: ((peakConnections / config.connection_limit) * 100).toFixed(1) + '%',
    currentUtilization: ((activeConnections / config.connection_limit) * 100).toFixed(1) + '%',
    totalQueries,
    slowQueries,
    slowQueryRate: totalQueries > 0 ? ((slowQueries / totalQueries) * 100).toFixed(1) + '%' : '0%'
  };
}

console.log('✅ Prisma initialized with connection pooling:', getConnectionPoolConfig());

export default prisma;
