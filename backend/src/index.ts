// Fastify app entrypoint
import Fastify from "fastify";
import websocket from "fastify-websocket";
import cors from "@fastify/cors";
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
import wsPlugin from "./plugins/ws.js";
import priceService from "./plugins/priceService.js";

const app = Fastify({
  logger: { transport: { target: "pino-pretty" } }
});

// CORS for frontend
app.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
});

// WebSocket support
app.register(websocket);
app.register(wsPlugin);

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

// Start WS price streamer (Birdeye) + warm SOL price
await priceService.start();

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: "0.0.0.0" }).then(() => {
  app.log.info(`🚀 API running on :${port}`);
});
