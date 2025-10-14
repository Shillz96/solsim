// Prisma client singleton with connection pooling for production scale
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Calculate optimal connection pool based on environment
// Railway Postgres Starter: 20 connections, reserve 5 for admin/migrations
const getConnectionPoolConfig = () => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return {
      connection_limit: 15, // Max concurrent connections
      pool_timeout: 60,     // Connection timeout (seconds)
      statement_cache_size: 500
    };
  }

  return {
    connection_limit: 5,
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

  return url.toString();
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl()
    }
  },
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Connection monitoring
let activeConnections = 0;
let peakConnections = 0;

prisma.$use(async (params, next) => {
  activeConnections++;
  peakConnections = Math.max(peakConnections, activeConnections);

  // Warn if approaching connection limit
  const config = getConnectionPoolConfig();
  if (activeConnections > config.connection_limit * 0.8) {
    console.warn(`⚠️ High DB connection usage: ${activeConnections}/${config.connection_limit}`);
  }

  try {
    return await next(params);
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
    utilization: ((peakConnections / config.connection_limit) * 100).toFixed(1) + '%'
  };
}

console.log('✅ Prisma initialized with connection pooling:', getConnectionPoolConfig());

export default prisma;
