// Portfolio routes with enhanced functionality
import { FastifyInstance } from "fastify";
import { 
  getPortfolio, 
  getPortfolioWithRealTimePrices, 
  getPortfolioTradingStats,
  getPortfolioPerformance 
} from "../services/portfolioService.js";

export default async function (app: FastifyInstance) {
  // Main portfolio endpoint with metadata enrichment
  app.get("/", async (req, reply) => {
    const userId = (req.query as any).userId;
    if (!userId) return reply.code(400).send({ error: "userId required" });
    
    try {
      const data = await getPortfolio(userId);
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
    if (!userId) return reply.code(400).send({ error: "userId required" });
    
    try {
      const data = await getPortfolioWithRealTimePrices(userId);
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
    if (!userId) return reply.code(400).send({ error: "userId required" });
    
    try {
      const stats = await getPortfolioTradingStats(userId);
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
    const days = parseInt((req.query as any).days) || 30;
    
    if (!userId) return reply.code(400).send({ error: "userId required" });
    
    try {
      const performance = await getPortfolioPerformance(userId, days);
      return { performance };
    } catch (error) {
      console.error("Portfolio performance fetch error:", error);
      return reply.code(500).send({ 
        error: "Failed to fetch portfolio performance" 
      });
    }
  });
}
