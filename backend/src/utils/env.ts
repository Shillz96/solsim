// Environment variable validation and configuration
import { z } from 'zod';

// Define environment schema
const envSchema = z.object({
  // Required Core Variables
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Helius Configuration (Required for price service)
  HELIUS_API: z.string().min(1, 'HELIUS_API key is required'),
  HELIUS_RPC_URL: z.string().url('HELIUS_RPC_URL must be a valid URL'),
  HELIUS_WS: z.string().url('HELIUS_WS must be a valid WebSocket URL'),

  // Optional with defaults
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_EXPIRY: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

  // Solana Configuration
  SOLANA_RPC_URL: z.string().url().optional(),
  SIM_TOKEN_MINT: z.string().optional(),
  REWARDS_WALLET_SECRET: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().default('15m'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Database Connection Pool
  DATABASE_MAX_CONNECTIONS: z.string().default('20'),
  DATABASE_CONNECTION_TIMEOUT: z.string().default('5000'),

  // Redis Configuration
  REDIS_MAX_RETRIES: z.string().default('3'),
  REDIS_RETRY_DELAY: z.string().default('500'),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Performance
  PRICE_CACHE_TTL: z.string().default('60'),
  MAX_WEBSOCKET_CONNECTIONS: z.string().default('1000'),
});

// Export the parsed and validated environment
export type Env = z.infer<typeof envSchema>;

let env: Env | undefined;

export function validateEnv(): Env {
  if (env) return env;

  try {
    env = envSchema.parse(process.env);

    // Log successful validation in production
    if (env.NODE_ENV === 'production') {
      console.log('✅ Environment variables validated successfully');
      console.log(`📊 Configuration:
        - Node Environment: ${env.NODE_ENV}
        - Port: ${env.PORT}
        - Database Pool Size: ${env.DATABASE_MAX_CONNECTIONS}
        - Rate Limit: ${env.RATE_LIMIT_MAX_REQUESTS} requests per ${env.RATE_LIMIT_WINDOW}
        - Max WebSocket Connections: ${env.MAX_WEBSOCKET_CONNECTIONS}
      `);
    }

    return env;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue =>
        `  - ${issue.path.join('.')}: ${issue.message}`
      ).join('\n');
      console.error(issues);

      // Provide helpful message for missing variables
      const missing = error.issues
        .filter(issue => issue.code === 'too_small' && issue.minimum === 1)
        .map(issue => issue.path[0]);

      if (missing.length > 0) {
        console.error('\n📝 Missing required environment variables:');
        console.error(missing.map(v => `  - ${v}`).join('\n'));
        console.error('\n💡 Please ensure all required variables are set in your .env file or environment');
      }
    }

    // Exit with error code to prevent startup with invalid config
    process.exit(1);
  }
}

// Helper function to get validated environment
export function getEnv(): Env {
  if (!env) {
    throw new Error('Environment not validated. Call validateEnv() first');
  }
  return env;
}

// Export convenience getters for common values
export function getConfig() {
  const e = getEnv();
  return {
    port: parseInt(e.PORT),
    isProduction: e.NODE_ENV === 'production',
    isDevelopment: e.NODE_ENV === 'development',
    jwtSecret: e.JWT_SECRET,
    jwtExpiry: e.JWT_EXPIRY,
    dbMaxConnections: parseInt(e.DATABASE_MAX_CONNECTIONS),
    dbConnectionTimeout: parseInt(e.DATABASE_CONNECTION_TIMEOUT),
    rateLimitWindow: e.RATE_LIMIT_WINDOW,
    rateLimitMaxRequests: parseInt(e.RATE_LIMIT_MAX_REQUESTS),
    maxWebSocketConnections: parseInt(e.MAX_WEBSOCKET_CONNECTIONS),
    priceCacheTTL: parseInt(e.PRICE_CACHE_TTL),
    corsOrigin: e.CORS_ORIGIN.split(',').map(s => s.trim()),
  };
}