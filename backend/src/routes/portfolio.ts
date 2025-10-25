// Portfolio routes with enhanced functionality
import { FastifyInstance } from "fastify";
import {
  getPortfolio,
  getPortfolioWithRealTimePrices,
  getPortfolioTradingStats,
  getPortfolioPerformance,
  getTokenTradingStats
} from "../services/portfolioService.js";
import { realtimePnLService } from "../services/realtimePnLService.js";

export default async function (app: FastifyInstance) {
  // Main portfolio endpoint with metadata enrichment
  app.get("/", async (req, reply) => {
    const userId = (req.query as any).userId;
    const tradeMode = (req.query as any).tradeMode || 'PAPER';
    
    if (!userId) return reply.code(400).send({ error: "userId required" });
    if (!['PAPER', 'REAL'].includes(tradeMode)) {
      return reply.code(400).send({ error: "tradeMode must be 'PAPER' or 'REAL'" });
    }
    
    try {
      const data = await getPortfolio(userId, tradeMode);
      return data;
    } catch (error) {
      console.error("Portfolio fetch error:", error);
      return reply.code(500).send({ 
        error: "Failed to fetch portfolio data" 
      });
    }
  });

  // Real-time portfolio endpoint with live price updates
  app.get("/realtime", async (req, reply) => {
    const userId = (req.query as any).userId;
    const tradeMode = (req.query as any).tradeMode || 'PAPER';
    
    if (!userId) return reply.code(400).send({ error: "userId required" });
    if (!['PAPER', 'REAL'].includes(tradeMode)) {
      return reply.code(400).send({ error: "tradeMode must be 'PAPER' or 'REAL'" });
    }
    
    try {
      const data = await getPortfolioWithRealTimePrices(userId, tradeMode);
      return data;
    } catch (error) {
      console.error("Real-time portfolio fetch error:", error);
      return reply.code(500).send({ 
        error: "Failed to fetch real-time portfolio data" 
      });
    }
  });

  // Trading statistics endpoint
  app.get("/stats", async (req, reply) => {
    const userId = (req.query as any).userId;
    const tradeMode = (req.query as any).tradeMode || 'PAPER';
    
    if (!userId) return reply.code(400).send({ error: "userId required" });
    if (!['PAPER', 'REAL'].includes(tradeMode)) {
      return reply.code(400).send({ error: "tradeMode must be 'PAPER' or 'REAL'" });
    }
    
    try {
      const stats = await getPortfolioTradingStats(userId, tradeMode);
      return stats;
    } catch (error) {
      console.error("Portfolio stats fetch error:", error);
      return reply.code(500).send({ 
        error: "Failed to fetch portfolio statistics" 
      });
    }
  });

  // Portfolio performance over time
  app.get("/performance", async (req, reply) => {
    const userId = (req.query as any).userId;
    const tradeMode = (req.query as any).tradeMode || 'PAPER';
    const days = parseInt((req.query as any).days) || 30;

    if (!userId) return reply.code(400).send({ error: "userId required" });
    if (!['PAPER', 'REAL'].includes(tradeMode)) {
      return reply.code(400).send({ error: "tradeMode must be 'PAPER' or 'REAL'" });
    }

    try {
      const performance = await getPortfolioPerformance(userId, days, tradeMode);
      return { performance };
    } catch (error) {
      console.error("Portfolio performance fetch error:", error);
      return reply.code(500).send({
        error: "Failed to fetch portfolio performance"
      });
    }
  });

  // Token-specific trading statistics (bought/sold/PnL/fees for a specific token)
  app.get("/token-stats", async (req, reply) => {
    const userId = (req.query as any).userId;
    const mint = (req.query as any).mint;
    const tradeMode = (req.query as any).tradeMode || 'PAPER';

    if (!userId) return reply.code(400).send({ error: "userId required" });
    if (!mint) return reply.code(400).send({ error: "mint (token address) required" });
    if (!['PAPER', 'REAL'].includes(tradeMode)) {
      return reply.code(400).send({ error: "tradeMode must be 'PAPER' or 'REAL'" });
    }

    try {
      const stats = await getTokenTradingStats(userId, mint, tradeMode);
      return stats;
    } catch (error) {
      console.error("Token stats fetch error:", error);
      return reply.code(500).send({
        error: "Failed to fetch token statistics"
      });
    }
  });

  // Historical PnL endpoint for charting
  app.get("/pnl-history", async (req, reply) => {
    const userId = (req.query as any).userId;
    const tradeMode = (req.query as any).tradeMode || 'PAPER';

    if (!userId) return reply.code(400).send({ error: "userId required" });
    if (!['PAPER', 'REAL'].includes(tradeMode)) {
      return reply.code(400).send({ error: "tradeMode must be 'PAPER' or 'REAL'" });
    }

    try {
      const history = await realtimePnLService.getHistoricalPnL(userId, tradeMode);
      return {
        userId,
        tradeMode,
        data: history,
        count: history.length
      };
    } catch (error) {
      console.error("Historical PnL fetch error:", error);
      return reply.code(500).send({
        error: "Failed to fetch historical PnL data"
      });
    }
  });
}
