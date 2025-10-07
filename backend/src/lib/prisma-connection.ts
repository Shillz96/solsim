import { PrismaClient } from '@prisma/client';

// Enhanced Prisma client with production-optimized connection pooling
let prisma: PrismaClient;

const createPrismaClient = (): PrismaClient => {
  // Production-optimized connection pool settings
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Add connection pooling parameters for production
  const connectionUrl = new URL(databaseUrl);
  
  // Production connection pool optimization
  if (process.env.NODE_ENV === 'production') {
    connectionUrl.searchParams.set('connection_limit', '5');      // Lower limit for Railway
    connectionUrl.searchParams.set('pool_timeout', '20');        // 20 second timeout
    connectionUrl.searchParams.set('connect_timeout', '60');     // 60 second connect timeout
    connectionUrl.searchParams.set('schema', 'public');          // Explicit schema
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl.toString(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });
};

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for Prisma client
if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = createPrismaClient();
  }
  prisma = global.__prisma;
}

// Enhanced disconnect handling
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
export default prisma;