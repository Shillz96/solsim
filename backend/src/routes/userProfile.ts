/**
 * User Profile & Trading Settings Routes
 *
 * Endpoints for managing user profile, trading mode, and balances
 */

import { FastifyInstance } from "fastify";
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";

const D = (x: Decimal | number | string) => new Decimal(x);

export default async function (app: FastifyInstance) {
  /**
   * GET /user-profile/:userId
   * Get user profile including trading mode and balances
   */
  app.get("/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };

    if (!userId) {
      return reply.code(400).send({
        error: "User ID required"
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          handle: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          twitter: true,
          discord: true,
          telegram: true,
          website: true,
          virtualSolBalance: true,
          realSolBalance: true,
          tradingMode: true,
          walletAddress: true,
          userTier: true,
          rewardPoints: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return reply.code(404).send({
          error: "User not found"
        });
      }

      return {
        success: true,
        user: {
          ...user,
          virtualSolBalance: user.virtualSolBalance.toString(),
          realSolBalance: user.realSolBalance.toString(),
          rewardPoints: user.rewardPoints.toString()
        }
      };
    } catch (error: any) {
      app.log.error("Failed to fetch user profile:", error);
      return reply.code(500).send({
        error: "Failed to fetch user profile"
      });
    }
  });

  /**
   * PATCH /user-profile/:userId/trading-mode
   * Toggle between PAPER and REAL trading modes
   */
  app.patch("/:userId/trading-mode", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { tradingMode } = req.body as { tradingMode: "PAPER" | "REAL" };

    if (!userId) {
      return reply.code(400).send({
        error: "User ID required"
      });
    }

    if (!tradingMode || !["PAPER", "REAL"].includes(tradingMode)) {
      return reply.code(400).send({
        error: "Invalid trading mode. Must be 'PAPER' or 'REAL'"
      });
    }

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { tradingMode },
        select: {
          id: true,
          tradingMode: true,
          virtualSolBalance: true,
          realSolBalance: true
        }
      });

      app.log.info({
        userId,
        tradingMode
      }, `User switched to ${tradingMode} trading mode`);

      return {
        success: true,
        tradingMode: user.tradingMode,
        balances: {
          virtualSol: user.virtualSolBalance.toString(),
          realSol: user.realSolBalance.toString()
        }
      };
    } catch (error: any) {
      app.log.error("Failed to update trading mode:", error);
      return reply.code(500).send({
        error: "Failed to update trading mode"
      });
    }
  });

  /**
   * GET /user-profile/:userId/balances
   * Get both virtual and real SOL balances
   */
  app.get("/:userId/balances", async (req, reply) => {
    const { userId } = req.params as { userId: string };

    if (!userId) {
      return reply.code(400).send({
        error: "User ID required"
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          virtualSolBalance: true,
          realSolBalance: true,
          tradingMode: true
        }
      });

      if (!user) {
        return reply.code(404).send({
          error: "User not found"
        });
      }

      return {
        success: true,
        balances: {
          virtualSol: user.virtualSolBalance.toString(),
          realSol: user.realSolBalance.toString(),
          currentMode: user.tradingMode,
          activeBalance: user.tradingMode === "PAPER"
            ? user.virtualSolBalance.toString()
            : user.realSolBalance.toString()
        }
      };
    } catch (error: any) {
      app.log.error("Failed to fetch balances:", error);
      return reply.code(500).send({
        error: "Failed to fetch balances"
      });
    }
  });

  /**
   * GET /user-profile/:userId/trading-stats
   * Get trading statistics separated by mode
   */
  app.get("/:userId/trading-stats", async (req, reply) => {
    const { userId } = req.params as { userId: string };

    if (!userId) {
      return reply.code(400).send({
        error: "User ID required"
      });
    }

    try {
      // Get paper trading stats
      const paperTrades = await prisma.trade.count({
        where: { userId, tradeMode: "PAPER" }
      });

      const paperPositions = await prisma.position.count({
        where: { userId, tradeMode: "PAPER", qty: { gt: 0 } }
      });

      const paperPnL = await prisma.realizedPnL.findMany({
        where: { userId, tradeMode: "PAPER" }
      });

      const paperRealizedPnL = paperPnL.reduce(
        (sum, record) => sum.add(record.pnlUsd || record.pnl),
        D(0)
      );

      // Get real trading stats
      const realTrades = await prisma.trade.count({
        where: { userId, tradeMode: "REAL" }
      });

      const realPositions = await prisma.position.count({
        where: { userId, tradeMode: "REAL", qty: { gt: 0 } }
      });

      const realPnL = await prisma.realizedPnL.findMany({
        where: { userId, tradeMode: "REAL" }
      });

      const realRealizedPnL = realPnL.reduce(
        (sum, record) => sum.add(record.pnlUsd || record.pnl),
        D(0)
      );

      return {
        success: true,
        paper: {
          totalTrades: paperTrades,
          activePositions: paperPositions,
          realizedPnL: paperRealizedPnL.toString()
        },
        real: {
          totalTrades: realTrades,
          activePositions: realPositions,
          realizedPnL: realRealizedPnL.toString()
        }
      };
    } catch (error: any) {
      app.log.error("Failed to fetch trading stats:", error);
      return reply.code(500).send({
        error: "Failed to fetch trading stats"
      });
    }
  });

  /**
   * POST /user-profile/:userId/reset-paper-trading
   * Reset paper trading account (positions, trades, balance)
   * Useful for users who want to start fresh
   */
  app.post("/:userId/reset-paper-trading", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { confirmReset } = req.body as { confirmReset: boolean };

    if (!userId) {
      return reply.code(400).send({
        error: "User ID required"
      });
    }

    if (!confirmReset) {
      return reply.code(400).send({
        error: "Must confirm reset by sending confirmReset: true"
      });
    }

    try {
      // Delete all paper trading data in transaction
      await prisma.$transaction(async (tx) => {
        // Delete position lots
        await tx.positionLot.deleteMany({
          where: { userId, tradeMode: "PAPER" }
        });

        // Delete positions
        await tx.position.deleteMany({
          where: { userId, tradeMode: "PAPER" }
        });

        // Delete realized PnL
        await tx.realizedPnL.deleteMany({
          where: { userId, tradeMode: "PAPER" }
        });

        // Delete trades
        await tx.trade.deleteMany({
          where: { userId, tradeMode: "PAPER" }
        });

        // Reset virtual SOL balance
        await tx.user.update({
          where: { id: userId },
          data: {
            virtualSolBalance: 100 // Reset to 100 SOL
          }
        });
      });

      app.log.info({ userId }, "Paper trading account reset");

      return {
        success: true,
        message: "Paper trading account has been reset",
        newBalance: "100"
      };
    } catch (error: any) {
      app.log.error("Failed to reset paper trading:", error);
      return reply.code(500).send({
        error: "Failed to reset paper trading account"
      });
    }
  });
}
