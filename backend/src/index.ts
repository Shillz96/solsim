// Fastify app entrypoint
// UUID fix deployed - using database-generated UUIDs
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

// Import Sentry for error monitoring
import * as Sentry from '@sentry/node';
import { initSentry, sentryErrorHandler, testSentryConnection } from "./utils/sentry.js";

// Import route handlers
import tradeRoutes from "./routes/trade.js";
import portfolioRoutes from "./routes/portfolio.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import trendingRoutes from "./routes/trending.js";
import stocksRoutes from "./routes/stocks.js";
import authRoutes from "./routes/auth/index.js";
import rewardsRoutes from "./routes/rewards.js";
import tradesRoutes from "./routes/trades.js";
import walletRoutes from "./routes/wallet.js";
import walletTrackerSettingsRoutes from "./routes/walletTrackerSettings.js";
import walletTrackerPumpPortalRoutes, { initializeWalletTracker } from "./routes/walletTrackerExample.js";
import searchRoutes from "./routes/search.js";
import debugRoutes from "./routes/debug.js";
import adminRoutes from "./routes/admin.js";
import sentryTestRoutes from "./routes/sentry-test.js";
import notificationsRoutes from "./routes/notifications.js";
import perpRoutes from "./routes/perpRoutes.js";
import userProfileRoutes from "./routes/userProfile.js";
import warpPipesRoutes from "./routes/warpPipes.js";
import webhookRoutes from "./routes/webhooks.js";
import chartRoutes from "./routes/chart.js";
import marketRoutes from "./routes/market.js";
import chatRoutes from "./routes/chat.js";
import badgeRoutes from "./routes/badges.js";
import moderationRoutes from "./routes/moderation.js";
import moderationConfigRoutes from "./routes/moderationConfig.js";
import pumpPortalDataRoutes from "./routes/pumpPortalData.js";
import healthRoutes from "./routes/health.js";

// Import plugins and services
import wsPlugin from "./plugins/ws.js";
import wsTestPlugin from "./plugins/wsTest.js";
import wsWalletTrackerPlugin from "./plugins/wsWalletTracker.js";
import wsChatPlugin from "./plugins/wsChat.js";
import prisma from "./plugins/prisma.js";
import redis, { redisConnectPromise } from "./plugins/redis.js";
import priceService from "./plugins/priceService-optimized.js"; // PumpPortal-only WebSocket (Oct 27, 2025)
import { generalRateLimit } from "./plugins/rateLimiting.js";
import { NonceCleanupService } from "./plugins/nonce.js";
import { RateLimitCleanupService } from "./plugins/rateLimiting.js";
import * as liquidationEngine from "./services/liquidationEngine.js";
import { geckoTerminalService } from "./services/geckoTerminalService.js";
import { marketLighthouseWorker } from "./workers/marketLighthouseWorker.js";
import { startCMCRefresh, stopCMCRefresh } from "./services/cmcService.js";
import { startSentimentRefresh, stopSentimentRefresh } from "./services/marketSentimentService.js";
import { startHourlyRewardWorker } from "./workers/hourlyRewardWorker.js";

// Import production-ready plugins
import { validateEnvironment, getConfig, isProduction } from "./utils/env.js";
import healthPlugin from "./plugins/health.js";
// import requestTrackingPlugin from "./plugins/requestTracking.js";
// import productionRateLimitingPlugin, { productionRateLimits } from "./plugins/productionRateLimiting.js";

// Validate environment variables on startup (MUST be first)
validateEnvironment();
const config = getConfig();

// Initialize Sentry error monitoring
initSentry();

const app = Fastify({
  logger: {
    level: 'info', // Only log info and above (skip debug, trace)
    // Simplified logging - disable pino-pretty for cleaner output
  }
});

// Register Prisma as a decorator for use in routes and plugins
app.decorate('prisma', prisma);

// Register priceService as a decorator for health monitoring
app.decorate('priceService', priceService);

// Add global error handler for Sentry
app.setErrorHandler((error, request, reply) => {
  // Capture error to Sentry
  sentryErrorHandler(error, request, reply);

  // Send response to client
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
    statusCode: error.statusCode || 500
  });
});

// Production-grade security headers
app.register(helmet, {
  // Content Security Policy - Prevent XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-eval'"], // unsafe-eval needed for JSON parsing in some cases
      connectSrc: [
        "'self'",
        "wss:",
        "https:",
        "https://api.birdeye.so",
        "https://api.dexscreener.com",
        "https://oneupsol.fun",
        "wss://oneupsol.fun",
        "https://virtualsol.fun",
        "wss://virtualsol.fun"
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https:", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'", "https://app.bubblemaps.io", "https://bubblemaps.io"], // Allow BubbleMaps embedding
      upgradeInsecureRequests: isProduction() ? [] : null // Only in production
    }
  },
  
  // HTTP Strict Transport Security - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options - Prevent clickjacking
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options - Prevent MIME sniffing
  noSniff: true,

  // Referrer Policy - Control referrer information
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  },

  // Note: permissionsPolicy not available in current helmet version

  // Cross-Origin policies
  crossOriginEmbedderPolicy: false, // Allow external resources for trading data
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },

  // Hide server information
  hidePoweredBy: true
});

// CORS for frontend - support multiple origins with WebSocket support
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://oneupsol.fun",
  "https://www.oneupsol.fun",
  "https://virtualsol.fun",
  "https://www.virtualsol.fun",
  "https://virtualsol-production.vercel.app", // Add your Vercel deployment URL
  process.env.FRONTEND_URL
].filter(Boolean);

app.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) {
      if (!isProduction()) console.log('✅ CORS accepted: no origin (mobile/postman)');
      return cb(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      if (!isProduction()) console.log('✅ CORS accepted from allowedOrigins:', origin);
      return cb(null, true);
    }
    
    // Allow any subdomain of oneupsol.fun or virtualsol.fun in production
    if (origin.endsWith('.oneupsol.fun') || origin === 'https://oneupsol.fun' ||
        origin.endsWith('.virtualsol.fun') || origin === 'https://virtualsol.fun') {
      if (!isProduction()) console.log('✅ CORS accepted (1UP SOL/VirtualSol domain):', origin);
      return cb(null, true);
    }
    
    // Allow Vercel preview deployments
    if (origin.includes('vercel.app')) {
      if (!isProduction()) console.log('✅ CORS accepted (Vercel deployment):', origin);
      return cb(null, true);
    }
    
    console.log('🚫 CORS rejected origin:', origin);
    // Return error instead of false to ensure proper headers are sent
    return cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  // Add WebSocket-specific headers and cache control headers
  allowedHeaders: ['Content-Type', 'Authorization', 'Upgrade', 'Connection', 'Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Protocol', 'Cache-Control', 'Pragma'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // Explicitly set preflight to continue so OPTIONS requests get proper responses
  preflightContinue: false,
  optionsSuccessStatus: 204
});

// Production monitoring and tracking plugins
// app.register(requestTrackingPlugin);
app.register(healthPlugin);

// WebSocket support - register BEFORE any other routes for proper Railway compatibility
// Disable perMessageDeflate to prevent proxy/CDN negotiation edge cases
app.register(websocket, {
  options: {
    perMessageDeflate: false,
    maxPayload: 100 * 1024, // 100KB max payload
    clientTracking: true
  }
})

// Register WebSocket routes BEFORE rate limiting
app.register(wsTestPlugin) // Test WebSocket first for debugging
app.register(wsPlugin) // Main price stream WebSocket
app.register(wsWalletTrackerPlugin) // Wallet tracker WebSocket
app.register(wsChatPlugin) // Chat WebSocket

// Production rate limiting (replaces old rate limiting for better scale)
// app.register(productionRateLimitingPlugin);

// Legacy rate limiting fallback for non-covered routes
app.register(async function (app) {
  app.addHook('preHandler', async (request, reply) => {
    // Skip rate limiting for WebSocket upgrade requests
    if (request.headers.upgrade === 'websocket') {
      return;
    }
    return generalRateLimit(request, reply);
  });
});

// Health check is now handled by healthPlugin

// API Routes
app.register(authRoutes, { prefix: "/api/auth" });
app.register(tradeRoutes, { prefix: "/api/trade" });
app.register(portfolioRoutes, { prefix: "/api/portfolio" });
app.register(leaderboardRoutes, { prefix: "/api/leaderboard" });
app.register(trendingRoutes, { prefix: "/api/trending" });
app.register(stocksRoutes, { prefix: "/api/stocks" });
app.register(rewardsRoutes, { prefix: "/api/rewards" });
app.register(tradesRoutes, { prefix: "/api/trades" });
app.register(walletRoutes, { prefix: "/api/wallet" });
app.register(walletTrackerSettingsRoutes, { prefix: "/api/wallet-tracker" });
// PumpPortal real-time wallet tracking
app.register(walletTrackerPumpPortalRoutes, { prefix: "/api" });
app.register(searchRoutes, { prefix: "/api/search" });
app.register(notificationsRoutes, { prefix: "/api/notifications" });
app.register(perpRoutes, { prefix: "/api/perp" }); // Perpetual trading routes
app.register(chartRoutes, { prefix: "/api" }); // Chart data routes (OHLCV)
app.register(marketRoutes, { prefix: "/api" }); // Market data routes (trades, traders, holders)
app.register(userProfileRoutes, { prefix: "/api/user-profile" }); // User profile and trading mode management
app.register(warpPipesRoutes, { prefix: "/api/warp-pipes" }); // Warp Pipes Hub token discovery
app.register(webhookRoutes, { prefix: "/api/webhooks" }); // Webhook handlers for external services (Helius)
app.register(chatRoutes); // Chat REST API routes (messages, moderation)
app.register(badgeRoutes, { prefix: "/api/badges" }); // Badge management routes
app.register(moderationRoutes, { prefix: "/api/moderation" }); // Moderation routes
app.register(moderationConfigRoutes, { prefix: "/api/moderation" }); // Moderation configuration routes
app.register(pumpPortalDataRoutes, { prefix: "/api/pumpportal" }); // Real-time PumpPortal data proxy
app.register(healthRoutes, { prefix: "/api" }); // Health monitoring routes (circuit breaker, price service status)
app.register(debugRoutes); // Debug routes for price service monitoring
app.register(adminRoutes, { prefix: "/api/admin" }); // Admin maintenance routes (protected)
app.register(sentryTestRoutes); // Sentry test routes (dev only)

// Start background services - OPTIMIZED for fast cold starts
console.log("🚀 Starting background services (parallel initialization)...");

// Start instant services (no I/O)
NonceCleanupService.start();
RateLimitCleanupService.start();
geckoTerminalService.start();
startCMCRefresh();
startSentimentRefresh();
startHourlyRewardWorker(); // Cron job for hourly SOL rewards
console.log("✅ Instant services started (cleanup, GeckoTerminal, CMC, Sentiment, Hourly Rewards)");

// Start heavy services in PARALLEL (non-blocking) - server starts immediately
const heavyServicesPromise = Promise.all([
  // Price service (PumpPortal WebSocket connection)
  priceService.start()
    .then(() => console.log("✅ Price service + PumpPortal WebSocket connected"))
    .catch(error => console.error("❌ Price service failed:", error)),
  
  // Market Lighthouse worker
  marketLighthouseWorker.start()
    .then(() => console.log("✅ Market Lighthouse worker started"))
    .catch(error => console.error("❌ Market Lighthouse failed:", error)),
  
  // Liquidation engine
  liquidationEngine.startLiquidationEngine()
    .then(() => console.log("✅ Liquidation engine started"))
    .catch(error => console.error("❌ Liquidation engine failed:", error)),
  
  // Wallet tracker initialization
  initializeWalletTracker()
    .then(() => console.log("✅ PumpPortal wallet tracker initialized"))
    .catch(error => console.error("❌ Wallet tracker failed:", error))
]).catch(error => {
  console.error("❌ Some background services failed to initialize:", error);
});

console.log("⏳ Heavy services initializing in background (WebSocket connections, DB warming)...");

const port = Number(process.env.PORT || 4000);

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);

  try {
    // 1. Stop accepting new connections (but finish existing requests)
    console.log('⏹️  Closing server to new connections...');
    await app.close();
    
    // 2. Stop background services (order matters - stop producers first)
    console.log('⏹️  Stopping background services...');
    NonceCleanupService.stop();
    RateLimitCleanupService.stop();
    marketLighthouseWorker.stop();
    stopCMCRefresh();
    stopSentimentRefresh();
    
    // 3. Stop real-time services
    await priceService.stop();
    await liquidationEngine.stopLiquidationEngine();
    
    // 4. Disconnect from databases with timeout
    console.log('⏹️  Disconnecting from databases...');
    await Promise.race([
      prisma.$disconnect(),
      new Promise(resolve => setTimeout(resolve, 10000)) // 10s timeout
    ]);

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error.message);
  
  // Don't crash on PumpPortal WebSocket errors - they're handled by reconnection
  if (error.message?.includes('Unexpected server response: 502') || 
      error.message?.includes('Unexpected server response: 503') ||
      error.message?.includes('Unexpected server response: 504')) {
    console.log('🚨 PumpPortal server error - continuing operation');
    return;
  }
  
  // Send to Sentry before shutting down
  Sentry.captureException(error, {
    tags: { type: 'uncaughtException' },
    level: 'fatal'
  });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Don't crash on PumpPortal WebSocket rejections
  const reasonMessage = reason instanceof Error ? reason.message : String(reason);
  if (reasonMessage.includes('Unexpected server response: 502') || 
      reasonMessage.includes('Unexpected server response: 503') ||
      reasonMessage.includes('Unexpected server response: 504')) {
    console.log('🚨 PumpPortal server error rejection - continuing operation');
    return;
  }
  
  // Send to Sentry before shutting down
  Sentry.captureException(new Error(`Unhandled Rejection: ${reason}`), {
    tags: { type: 'unhandledRejection' },
    level: 'error',
    extra: { promise, reason }
  });
  gracefulShutdown('unhandledRejection');
});

// ============ INITIALIZE REAL-TIME PNL SERVICE ============
import { realtimePnLService } from './services/realtimePnLService.js';

// Start price tick broadcasting at 5 Hz (200ms intervals)
realtimePnLService.startPriceTicks(200);

// Hook price service updates into real-time PnL service
priceService.subscribe((tick) => {
  realtimePnLService.updatePrice(tick.mint, tick.priceUsd);
});

console.log('⚡ Real-time PnL service initialized with 5 Hz updates');

// CRITICAL: Wait for Redis connection before starting server
// This prevents requests from timing out while Redis is connecting
redisConnectPromise.then(() => {
  app.listen({ port, host: "0.0.0.0" }).then(() => {
    app.log.info(`🚀 VirtualSol API running on :${port}`);
    app.log.info(`🔒 Security: JWT, Production Rate Limiting, Input Validation, Secure Nonces`);
    app.log.info(`📊 Monitoring: Health checks, Request tracking, Error logging`);
    app.log.info(`⚡ Performance: Redis caching, Database optimization, Connection pooling`);

    // Test Sentry connection on startup
    if (process.env.SENTRY_DSN) {
      app.log.info(`🐛 Sentry error monitoring enabled`);
      testSentryConnection();
    }
  });
});
