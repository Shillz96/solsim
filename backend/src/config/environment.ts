import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with proper ES module path
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface Config {
  port: number;
  priceStreamPort: number;
  frontendOrigin: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  apis: {
    birdeye: {
      apiKey?: string;
      baseUrl: string;
    };
    dexscreener: {
      baseUrl: string;
    };
    helius: {
      apiKey?: string;
      baseUrl: string;
      rpcUrl?: string;
      secureRpcUrl?: string;
      wsUrl?: string;
    };
    coingecko: {
      apiKey?: string;
      baseUrl: string;
    };
    solanaTracker: {
      apiKey?: string;
      baseUrl: string;
    };
    twitter: {
      clientId?: string;
      clientSecret?: string;
    };
  };
  development: {
    authBypass: boolean;
  };
  broadcastToken?: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4002', 10),
  priceStreamPort: parseInt(process.env.PRICE_STREAM_PORT || '4001', 10),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3001',
  database: {
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  apis: {
    birdeye: {
      apiKey: process.env.BIRDEYE_API_KEY,
      baseUrl: process.env.BIRDEYE_BASE_URL || 'https://public-api.birdeye.so',
    },
    dexscreener: {
      baseUrl: process.env.DEXSCREENER_BASE_URL || 'https://api.dexscreener.com/latest',
    },
    helius: {
      apiKey: process.env.HELIUS_API_KEY,
      baseUrl: process.env.HELIUS_BASE_URL || 'https://api.helius.xyz',
      rpcUrl: process.env.HELIUS_RPC_URL,
      secureRpcUrl: process.env.HELIUS_SECURE_RPC_URL,
      wsUrl: process.env.HELIUS_WS_URL,
    },
    coingecko: {
      apiKey: process.env.COINGECKO_API_KEY,
      baseUrl: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
    },
    solanaTracker: {
      apiKey: process.env.SOLANA_TRACKER_API_KEY,
      baseUrl: 'https://data.solanatracker.io',
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    },
  },
  development: {
    authBypass: process.env.DEV_AUTH_BYPASS === 'true',
  },
  broadcastToken: process.env.BROADCAST_TOKEN,
};

// Environment validation configuration
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';

// Required environment variables
const requiredEnvVars = ['DATABASE_URL'];

// Critical API keys for production (at least one price source required)
const criticalApiKeys = ['BIRDEYE_API_KEY', 'HELIUS_API_KEY', 'COINGECKO_API_KEY', 'SOLANA_TRACKER_API_KEY'];

// Recommended but not critical
const recommendedEnvVars = ['REDIS_URL', 'BROADCAST_TOKEN'];

// Validate JWT_SECRET for production environments
if (isProduction) {
  requiredEnvVars.push('JWT_SECRET', 'FRONTEND_ORIGIN');
}

// Check required variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('💡 Tip: Check your .env file or environment configuration');
  process.exit(1);
}

// Validate at least one API key is present for price data
const availableApiKeys = criticalApiKeys.filter(key => process.env[key]);
if (availableApiKeys.length === 0) {
  console.error('❌ CRITICAL: No price API keys configured!');
  console.error('💡 At least one of these API keys is required:', criticalApiKeys.join(', '));
  console.error('💡 Application cannot function without price data sources');
  if (isProduction) {
    process.exit(1);
  } else {
    console.warn('⚠️  Development mode: Continuing without API keys (limited functionality)');
  }
}

// Validate JWT_SECRET in production
if (isProduction) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is required for production');
    console.error('💡 Set JWT_SECRET in your deployment platform (Railway, Vercel, etc.)');
    process.exit(1);
  }
  if (jwtSecret === 'development-secret-key') {
    console.error('❌ CRITICAL: Using development JWT secret in production!');
    console.error('💡 Set a secure JWT_SECRET environment variable (min 32 characters)');
    process.exit(1);
  }
  if (jwtSecret.length < 32) {
    console.error('❌ CRITICAL: JWT_SECRET is too short (minimum 32 characters required)');
    console.error('💡 Use a secure random string generator');
    process.exit(1);
  }
  console.log('✅ JWT_SECRET configured correctly for production');
}

// Warn about missing recommended environment variables (non-blocking)
const missingRecommendedVars = recommendedEnvVars.filter(envVar => !process.env[envVar]);
if (missingRecommendedVars.length > 0) {
  console.warn('⚠️  Missing recommended environment variables:', missingRecommendedVars.join(', '));
  console.warn('💡 Some features may be limited. Check documentation for setup instructions.');
}

// Validate API key format (basic validation to catch configuration errors)
const validateApiKey = (key: string | undefined, name: string, minLength: number = 16): boolean => {
  if (!key) return false;
  
  if (key.length < minLength) {
    console.warn(`⚠️  ${name} appears invalid (minimum ${minLength} characters required, got ${key.length})`);
    return false;
  }
  
  // Check for common placeholder values
  const placeholders = ['your_api_key', 'placeholder', 'changeme', 'example'];
  if (placeholders.some(p => key.toLowerCase().includes(p))) {
    console.error(`❌ ${name} contains placeholder value - update with real API key`);
    if (isProduction) {
      console.error('💡 Production requires valid API keys');
    }
    return false;
  }
  
  return true;
};

// Validate each configured API key
const validKeys: string[] = [];
if (validateApiKey(config.apis.birdeye.apiKey, 'BIRDEYE_API_KEY')) validKeys.push('Birdeye');
if (validateApiKey(config.apis.helius.apiKey, 'HELIUS_API_KEY')) validKeys.push('Helius');
if (validateApiKey(config.apis.coingecko.apiKey, 'COINGECKO_API_KEY', 20)) validKeys.push('CoinGecko');
if (validateApiKey(config.apis.solanaTracker.apiKey, 'SOLANA_TRACKER_API_KEY')) validKeys.push('Solana Tracker');

// Log successful configuration (without exposing actual key values)
console.log('✅ Environment configuration loaded successfully');
console.log(`  ✓ ${validKeys.length} price API source(s) configured: ${validKeys.join(', ')}`);
if (config.redis.url) console.log('  ✓ Redis configured for caching and rate limiting');
if (config.broadcastToken) console.log('  ✓ Broadcast token configured');

// Security check: Warn if sensitive defaults are still in use
if (!isProduction && config.jwt.secret === 'development-secret-key') {
  console.log('  ℹ️  Using development JWT secret (OK for dev, not for production)');
}

export default config;