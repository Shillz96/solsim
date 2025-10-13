// Fastify app entrypoint
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import tradeRoutes from "./routes/trade.js";
import portfolioRoutes from "./routes/portfolio.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import trendingRoutes from "./routes/trending.js";
import authRoutes from "./routes/auth.js";
import rewardsRoutes from "./routes/rewards.js";
import tradesRoutes from "./routes/trades.js";
import walletRoutes from "./routes/wallet.js";
import walletTrackerRoutes from "./routes/walletTracker.js";
import searchRoutes from "./routes/search.js";
import candleRoutes from "./routes/candles.js";
import notesRoutes from "./routes/notes.js";
import debugRoutes from "./routes/debug.js";
import wsPlugin from "./plugins/ws.js";
import wsTestPlugin from "./plugins/wsTest.js";
import priceService from "./plugins/priceService.js";
import { generalRateLimit } from "./plugins/rateLimiting.js";
import { NonceCleanupService } from "./plugins/nonce.js";
import { RateLimitCleanupService } from "./plugins/rateLimiting.js";

const app = Fastify({
  logger: { transport: { target: "pino-pretty" } }
});

// Security headers
app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"]
    }
  }
});

// CORS for frontend - support multiple origins with WebSocket support
const allowedOrigins = [
  "http://localhost:3000",
  "https://solsim.fun",
  "https://www.solsim.fun",
  "https://solsim-3uf1qvvqp-shillz96s-projects.vercel.app", // Add your Vercel deployment URL
  process.env.FRONTEND_URL
].filter(Boolean);

app.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return cb(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    
    // Allow any subdomain of solsim.fun in production
    if (origin.endsWith('.solsim.fun') || origin === 'https://solsim.fun') {
      return cb(null, true);
    }
    
    // Allow Vercel preview deployments
    if (origin.includes('vercel.app')) {
      return cb(null, true);
    }
    
    console.log('🚫 CORS rejected origin:', origin);
    return cb(null, false); // Reject with false, not error
  },
  credentials: true,
  // Add WebSocket-specific headers
  allowedHeaders: ['Content-Type', 'Authorization', 'Upgrade', 'Connection', 'Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Protocol'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

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

// General rate limiting for API routes only (not WebSocket)
app.register(async function (app) {
  app.addHook('preHandler', async (request, reply) => {
    // Skip rate limiting for WebSocket upgrade requests
    if (request.headers.upgrade === 'websocket') {
      return;
    }
    return generalRateLimit(request, reply);
  });
});

// Health check
app.get("/health", async () => ({ ok: true, timestamp: new Date().toISOString() }));

// API Routes
app.register(authRoutes, { prefix: "/api/auth" });
app.register(tradeRoutes, { prefix: "/api/trade" });
app.register(portfolioRoutes, { prefix: "/api/portfolio" });
app.register(leaderboardRoutes, { prefix: "/api/leaderboard" });
app.register(trendingRoutes, { prefix: "/api/trending" });
app.register(rewardsRoutes, { prefix: "/api/rewards" });
app.register(tradesRoutes, { prefix: "/api/trades" });
app.register(walletRoutes, { prefix: "/api/wallet" });
app.register(walletTrackerRoutes, { prefix: "/api/wallet-tracker" });
app.register(searchRoutes, { prefix: "/api/search" });
app.register(candleRoutes, { prefix: "/api/candles" });
app.register(notesRoutes); // Note: This route is already prefixed in the implementation
app.register(debugRoutes); // Debug routes for price service monitoring

// Start background services
console.log("🚀 Starting background services...");

// Start cleanup services
NonceCleanupService.start();
RateLimitCleanupService.start();

// Start WS price streamer (Birdeye) + warm SOL price
await priceService.start();

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: "0.0.0.0" }).then(() => {
  app.log.info(`🚀 Secure API running on :${port}`);
  app.log.info(`🔒 Security features enabled: JWT, Rate Limiting, Input Validation, Secure Nonces`);
});
