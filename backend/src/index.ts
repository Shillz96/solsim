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
import wsPlugin from "./plugins/ws.js";
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

// CORS for frontend - support multiple origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://solsim.fun",
  "https://www.solsim.fun",
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
    
    return cb(null, false); // Reject with false, not error
  },
  credentials: true
});

// WebSocket support
app.register(websocket);
app.register(wsPlugin);

// General rate limiting for all API routes
app.register(async function (app) {
  app.addHook('preHandler', generalRateLimit);
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
