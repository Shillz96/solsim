// Enhanced Trade routes with comprehensive response
import { FastifyInstance } from "fastify";
import { fillTrade } from "../services/tradeService.js";
import priceService from "../plugins/priceService.js";
import prisma from "../plugins/prisma.js";

export default async function (app: FastifyInstance) {
  // Execute a trade
  app.post("/", async (req, reply) => {
    const { userId, mint, side, qty } = req.body as {
      userId: string;
      mint: string;
      side: "BUY" | "SELL";
      qty: string;
    };

    // Validation
    if (!userId || !mint || !side || !qty) {
      return reply.code(400).send({ 
        error: "Missing required fields: userId, mint, side, qty" 
      });
    }

    if (!["BUY", "SELL"].includes(side)) {
      return reply.code(400).send({ 
        error: "Invalid side. Must be 'BUY' or 'SELL'" 
      });
    }

    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return reply.code(400).send({ 
        error: "Invalid quantity. Must be a positive number" 
      });
    }

    try {
      // Execute the trade
      const result = await fillTrade({ userId, mint, side, qty });
      
      // Get current price for real-time updates (try cache first, then fetch)
      let currentTick = await priceService.getLastTick(mint);
      if (!currentTick) {
        // Aggressively fetch fresh price data for new tokens
        currentTick = await priceService.fetchTokenPrice(mint);
      }
      
      // CRITICAL FIX: Use last known fill price from trade record as fallback
      // Prevents failures when the price service is briefly unavailable right after a trade
      if (!currentTick && result?.trade?.price) {
        console.warn(`[Trade] Price service unavailable for ${mint.slice(0, 8)}, using trade fill price as fallback`);
        const fallbackPrice = Number(String(result.trade.price));
        if (Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
          currentTick = {
            mint,
            priceUsd: fallbackPrice,
            timestamp: Date.now(),
            source: 'trade-fallback'
          };
        }
      }
      
      // If still no price (shouldn't happen since fillTrade requires price), return 503 not 500
      if (!currentTick) {
        console.error(`[Trade] No price data available for ${mint.slice(0, 8)} after successful trade - this should not happen`);
        return reply.code(503).send({ 
          error: "Price data temporarily unavailable. Trade executed successfully but current price cannot be displayed.",
          code: "PRICE_UNAVAILABLE",
          trade: {
            id: result.trade.id,
            side: result.trade.side,
            mint: result.trade.mint,
            qty: result.trade.qty.toString(),
            executedAt: result.trade.createdAt
          }
        });
      }
      
      // Format response for frontend
      return {
        success: true,
        trade: {
          id: result.trade.id,
          userId: result.trade.userId,
          tokenAddress: result.trade.tokenAddress,
          side: result.trade.side,
          quantity: String(result.trade.quantity),
          price: String(result.trade.price),
          totalCost: String(result.trade.totalCost),
          costUsd: result.trade.costUsd ? String(result.trade.costUsd) : undefined,
          timestamp: result.trade.timestamp,
          marketCapUsd: result.trade.marketCapUsd ? String(result.trade.marketCapUsd) : undefined
        },
        position: {
          mint: result.position.mint,
          quantity: String(result.position.qty),
          costBasis: String(result.position.costBasis),
          currentPrice: String(currentTick.priceUsd),
          unrealizedPnL: String(
            result.position.qty
              .mul(currentTick.priceUsd)
              .sub(result.position.qty.mul(result.position.costBasis))
          )
        },
        portfolioTotals: {
          totalValueUsd: String(result.portfolioTotals.totalValueUsd),
          totalCostBasis: String(result.portfolioTotals.totalCostBasis),
          unrealizedPnL: String(result.portfolioTotals.unrealizedPnL),
          realizedPnL: String(result.portfolioTotals.realizedPnL),
          solBalance: String(result.portfolioTotals.solBalance)
        },
        rewardPointsEarned: String(result.rewardPointsEarned),
        currentPrice: currentTick.priceUsd
      };
    } catch (error: any) {
      app.log.error("Trade execution failed:", error);
      
      // Return specific error messages for better UX
      const errorMessage = error.message || "Trade execution failed";
      return reply.code(400).send({ 
        error: errorMessage,
        code: error.code || "TRADE_FAILED"
      });
    }
  });

  // Get trade history for a user
  app.get("/history/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { limit = "50", offset = "0", mint, tradeMode = "PAPER" } = req.query as {
      limit?: string;
      offset?: string;
      mint?: string;
      tradeMode?: string;
    };

    if (!['PAPER', 'REAL'].includes(tradeMode)) {
      return reply.code(400).send({ error: "tradeMode must be 'PAPER' or 'REAL'" });
    }

    try {
      const trades = await prisma.trade.findMany({
        where: {
          userId,
          tradeMode: tradeMode as 'PAPER' | 'REAL',
          ...(mint && { mint })
        },
        orderBy: { timestamp: "desc" },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              avatarUrl: true
            }
          }
        }
      });

      return {
        trades: trades.map((trade: any) => ({
          id: trade.id,
          tokenAddress: trade.tokenAddress,
          side: trade.side,
          quantity: trade.quantity.toString(),
          price: trade.price.toString(),
          totalCost: trade.totalCost.toString(),
          costUsd: trade.costUsd?.toString(),
          timestamp: trade.timestamp,
          marketCapUsd: trade.marketCapUsd?.toString(),
          user: trade.user
        })),
        total: trades.length,
        hasMore: trades.length === parseInt(limit)
      };
    } catch (error: any) {
      app.log.error("Failed to fetch trade history:", error);
      return reply.code(500).send({ error: "Failed to fetch trade history" });
    }
  });
}
