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
      connection_limit: backendLimit,  // Increased to 25 for 32vCPU/32GB instance
      pool_timeout: 60,                // Increased to 60 for high traffic
      statement_cache_size: 3000,      // Increased cache for 32GB RAM
      connect_timeout: 10              // Add connection timeout
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

  // Add query timeout and connection settings
  if (config.connect_timeout) {
    url.searchParams.set('connect_timeout', config.connect_timeout.toString());
  }

  // PostgreSQL-specific settings for connection stability
  url.searchParams.set('pgbouncer', 'true');  // Enable connection pooling
  url.searchParams.set('schema', 'public');

  return url.toString();
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl()
    }
  },
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"], // Removed "query" to reduce log noise
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Connection monitoring
let activeConnections = 0;
let peakConnections = 0;
let totalQueries = 0;
let slowQueries = 0;

prisma.$use(async (params, next) => {
  activeConnections++;
  peakConnections = Math.max(peakConnections, activeConnections);
  totalQueries++;

  const startTime = Date.now();
  const config = getConnectionPoolConfig();
  const utilization = activeConnections / config.connection_limit;

  // Enhanced logging with query context during high load
  if (utilization > 0.8) {
    console.error({
      level: 'CRITICAL',
      active: activeConnections,
      limit: config.connection_limit,
      utilization: `${(utilization * 100).toFixed(0)}%`,
      model: params.model,
      action: params.action,
      warning: '⚠️ AUTH QUERIES MAY BE BLOCKED - Database overload detected'
    }, '🚨 CRITICAL DB CONNECTION ALERT');
    // TODO: Send to monitoring service (Sentry, Datadog, etc.)
  } else if (utilization > 0.6) {
    console.warn({
      active: activeConnections,
      limit: config.connection_limit,
      utilization: `${(utilization * 100).toFixed(0)}%`,
      model: params.model,
      action: params.action
    }, '⚠️ High DB connection usage');
  }

  try {
    const result = await next(params);
    const duration = Date.now() - startTime;

    // Track slow queries (>500ms)
    if (duration > 500) {
      slowQueries++;
      console.warn({
        model: params.model,
        action: params.action,
        duration: `${duration}ms`,
        connectionUtilization: `${(utilization * 100).toFixed(0)}%`
      }, '🐌 Slow query detected');
    }

    return result;
  } finally {
    activeConnections--;
  }
});

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
