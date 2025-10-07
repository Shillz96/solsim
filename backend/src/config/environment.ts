import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with proper ES module path
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Debug: Log environment variable loading
console.log('🔍 Environment loading debug:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('- JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);

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

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'];

// Validate JWT_SECRET for production environments
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';
console.log('🔍 Production environment detection:');
console.log('- isProduction:', isProduction);
console.log('- NODE_ENV === production:', process.env.NODE_ENV === 'production');
console.log('- RAILWAY_ENVIRONMENT === production:', process.env.RAILWAY_ENVIRONMENT === 'production');

if (isProduction) {
  requiredEnvVars.push('JWT_SECRET');
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('💡 Tip: Check your .env file or environment configuration');
  process.exit(1);
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
    console.error('💡 Current length:', jwtSecret.length);
    process.exit(1);
  }
  console.log('✅ JWT_SECRET configured correctly for production');
}

export default config;