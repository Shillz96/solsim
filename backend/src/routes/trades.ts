// Recent trades routes
import { FastifyInstance } from "fastify";
import prisma from "../plugins/prisma.js";
import { getTokenMeta, getTokenMetaBatch } from "../services/tokenService.js";

export default async function tradesRoutes(app: FastifyInstance) {
  // Get recent trades (global feed)
  app.get("/", async (req, reply) => {
    const { limit = "50", offset = "0" } = req.query as any;
    
    try {
      const trades = await prisma.trade.findMany({
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              profileImage: true
            }
          }
        }
      });

      // Enrich with token metadata using batch API
      const uniqueMints = [...new Set(trades.map(t => t.mint))];
      const metadataResults = await getTokenMetaBatch(uniqueMints);

      const metadataMap = new Map();
      metadataResults.forEach(token => {
        if (token?.address) {
          metadataMap.set(token.address, token);
        }
      });

      const enriched = trades.map(trade => {
        const meta = metadataMap.get(trade.mint);
        return {
          ...trade,
          symbol: meta?.symbol,
          name: meta?.name,
          logoURI: meta?.logoURI,
        };
      });

      return { trades: enriched };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch trades" });
    }
  });

  // Get trades for a specific user
  app.get("/user/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { limit = "50", offset = "0" } = req.query as any;
    
    try {
      const trades = await prisma.trade.findMany({
        where: { userId },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: "desc" }
      });

      // Enrich with token metadata using batch API
      const uniqueMints = [...new Set(trades.map(t => t.mint))];
      const metadataResults = await getTokenMetaBatch(uniqueMints);

      const metadataMap = new Map();
      metadataResults.forEach(token => {
        if (token?.address) {
          metadataMap.set(token.address, token);
        }
      });

      const enriched = trades.map(trade => {
        const meta = metadataMap.get(trade.mint);
        return {
          ...trade,
          symbol: meta?.symbol,
          name: meta?.name,
          logoURI: meta?.logoURI,
        };
      });

      return { trades: enriched };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch user trades" });
    }
  });

  // Get trades for a specific token
  app.get("/token/:mint", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const { limit = "50", offset = "0" } = req.query as any;
    
    try {
      const trades = await prisma.trade.findMany({
        where: { mint },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              profileImage: true
            }
          }
        }
      });
      
      // Enrich with token metadata
      const meta = await getTokenMeta(mint);
      const enriched = trades.map((trade: any) => ({
        ...trade,
        symbol: meta?.symbol,
        name: meta?.name,
        logoURI: meta?.logoURI,
      }));
      
      return { trades: enriched };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch token trades" });
    }
  });

  // Get trade statistics
  app.get("/stats", async (req, reply) => {
    try {
      const [totalTrades, totalVolume, uniqueTraders] = await Promise.all([
        prisma.trade.count(),
        prisma.trade.aggregate({
          _sum: { costUsd: true }
        }),
        prisma.trade.groupBy({
          by: ["userId"],
          _count: { userId: true }
        })
      ]);
      
      return {
        totalTrades,
        totalVolumeUsd: totalVolume._sum.costUsd?.toString() || "0",
        uniqueTraders: uniqueTraders.length
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch trade stats" });
    }
  });
}