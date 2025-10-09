// Wallet routes for balance and transactions
import { FastifyInstance } from "fastify";
import prisma from "../plugins/prisma.js";

export default async function walletRoutes(app: FastifyInstance) {
  // Get user's virtual SOL balance
  app.get("/balance/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { virtualSolBalance: true }
      });

      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      return {
        userId,
        balance: user.virtualSolBalance.toString(),
        currency: "SOL"
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch balance" });
    }
  });

  // Add virtual SOL to user (admin only)
  app.post("/add-funds", async (req, reply) => {
    const { userId, amount, adminKey } = req.body as {
      userId: string;
      amount: string;
      adminKey: string;
    };
    
    // Admin authentication check
    if (adminKey !== process.env.ADMIN_KEY) {
      return reply.code(403).send({ error: "Unauthorized" });
    }
    
    if (!userId || !amount || parseFloat(amount) <= 0) {
      return reply.code(400).send({ error: "Valid userId and amount required" });
    }
    
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          virtualSolBalance: {
            increment: parseFloat(amount)
          }
        }
      });

      return {
        userId,
        newBalance: user.virtualSolBalance.toString(),
        added: amount
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to add funds" });
    }
  });

  // Get wallet transaction history
  app.get("/transactions/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { limit = "50", offset = "0" } = req.query as any;
    
    try {
      // Get trades as transactions
      const trades = await prisma.trade.findMany({
        where: { userId },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          side: true,
          quantity: true,
          costUsd: true,
          mint: true,
          createdAt: true
        }
      });
      
      // Format as wallet transactions
      const transactions = trades.map((trade: any) => ({
        id: trade.id,
        type: trade.side === "BUY" ? "DEBIT" : "CREDIT",
        amount: trade.costUsd.toString(),
        currency: "USD",
        description: `${trade.side} ${trade.qty} tokens`,
        mint: trade.mint,
        timestamp: trade.createdAt
      }));
      
      return { transactions };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch transactions" });
    }
  });

  // Get wallet statistics
  app.get("/stats/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    try {
      const [user, tradeStats, positionCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { virtualSolBalance: true, createdAt: true }
        }),
        prisma.trade.aggregate({
          where: { userId },
          _sum: { costUsd: true },
          _count: { id: true }
        }),
        prisma.position.count({
          where: { userId, qty: { gt: 0 } }
        })
      ]);
      
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }
      
      return {
        userId,
        balance: user.virtualSolBalance.toString(),
        totalTradeVolume: tradeStats._sum.costUsd?.toString() || "0",
        totalTrades: tradeStats._count.id,
        activePositions: positionCount,
        accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) // days
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch wallet stats" });
    }
  });
}