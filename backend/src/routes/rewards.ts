// Hourly Rewards routes - SOL distribution system
import { FastifyInstance } from "fastify";
import prisma from "../plugins/prisma.js";

export default async function rewardsRoutes(app: FastifyInstance) {
  // =====================================================
  // HOURLY REWARDS ENDPOINTS
  // =====================================================

  /**
   * GET /rewards/hourly/next-distribution
   * Returns seconds until the next hourly distribution (top of the hour)
   */
  app.get("/hourly/next-distribution", async (req, reply) => {
    try {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const secondsUntilNext = Math.floor((nextHour.getTime() - now.getTime()) / 1000);

      return {
        secondsUntilNext,
        nextDistributionTime: nextHour.toISOString()
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to calculate next distribution" });
    }
  });

  /**
   * GET /rewards/hourly/last-distribution
   * Returns the most recent hourly distribution with top 10 winners
   */
  app.get("/hourly/last-distribution", async (req, reply) => {
    try {
      // Query the most recent distributed pool with payouts
      const lastPool = await prisma.hourlyRewardPool.findFirst({
        where: { distributed: true },
        orderBy: { distributedAt: 'desc' },
        include: {
          payouts: {
            orderBy: { rank: 'asc' },
            take: 10,
            include: {
              user: {
                select: {
                  handle: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      });

      // If no distribution has occurred yet, return empty result
      if (!lastPool) {
        return {
          poolId: null,
          distributedAt: null,
          totalPoolAmount: "0",
          winnersCount: 0,
          winners: [],
          message: "No distributions have occurred yet. The first distribution will happen at the top of the next hour!"
        };
      }

      // Format winners data for frontend
      const winners = lastPool.payouts.map(payout => ({
        rank: payout.rank,
        userId: payout.userId,
        handle: payout.user.handle,
        avatarUrl: payout.user.avatarUrl,
        profitPercent: payout.profitPercentage.toString(),
        rewardAmount: payout.rewardAmount.toString(),
        walletAddress: payout.walletAddress,
        txSignature: payout.txSignature,
        status: payout.status
      }));

      return {
        poolId: lastPool.id,
        distributedAt: lastPool.distributedAt?.toISOString(),
        totalPoolAmount: lastPool.poolAmount.toString(),
        winnersCount: lastPool.payouts.length,
        winners
      };
    } catch (error: any) {
      app.log.error("Failed to fetch last distribution:", error);
      return reply.code(500).send({ error: "Failed to fetch last distribution" });
    }
  });

  /**
   * GET /rewards/hourly/current-pool
   * Returns the current hour's pool information (before distribution)
   */
  app.get("/hourly/current-pool", async (req, reply) => {
    try {
      const now = new Date();
      const currentHourStart = new Date(now);
      currentHourStart.setMinutes(0, 0, 0);

      const currentPool = await prisma.hourlyRewardPool.findFirst({
        where: {
          hourStart: currentHourStart,
          distributed: false
        }
      });

      if (!currentPool) {
        return {
          poolAmount: "0",
          message: "Current pool is being accumulated"
        };
      }

      return {
        poolAmount: currentPool.poolAmount.toString(),
        platformAmount: currentPool.platformAmount.toString(),
        totalCreatorRewards: currentPool.totalCreatorRewards.toString()
      };
    } catch (error: any) {
      app.log.error("Failed to fetch current pool:", error);
      return reply.code(500).send({ error: "Failed to fetch current pool" });
    }
  });

  /**
   * GET /rewards/hourly/my-winnings/:userId
   * Returns a user's hourly reward payout history
   */
  app.get("/hourly/my-winnings/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };

    try {
      const payouts = await prisma.hourlyRewardPayout.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          pool: {
            select: {
              hourStart: true,
              hourEnd: true,
              poolAmount: true
            }
          }
        }
      });

      const winnings = payouts.map(payout => ({
        rank: payout.rank,
        profitPercent: payout.profitPercentage.toString(),
        rewardAmount: payout.rewardAmount.toString(),
        txSignature: payout.txSignature,
        status: payout.status,
        distributionTime: payout.pool.hourStart.toISOString(),
        createdAt: payout.createdAt.toISOString()
      }));

      const totalEarned = payouts
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + parseFloat(p.rewardAmount.toString()), 0);

      return {
        totalEarned: totalEarned.toString(),
        winningsCount: payouts.length,
        winnings
      };
    } catch (error: any) {
      app.log.error("Failed to fetch user winnings:", error);
      return reply.code(500).send({ error: "Failed to fetch user winnings" });
    }
  });

  /**
   * GET /rewards/hourly/stats
   * Returns overall hourly rewards statistics
   */
  app.get("/hourly/stats", async (req, reply) => {
    try {
      const [totalDistributions, totalAmount, totalWinners] = await Promise.all([
        prisma.hourlyRewardPool.count({ where: { distributed: true } }),
        prisma.hourlyRewardPool.aggregate({
          where: { distributed: true },
          _sum: { poolAmount: true }
        }),
        prisma.hourlyRewardPayout.count({ where: { status: 'COMPLETED' } })
      ]);

      return {
        totalDistributions,
        totalAmountDistributed: totalAmount._sum.poolAmount?.toString() || "0",
        totalWinners
      };
    } catch (error: any) {
      app.log.error("Failed to fetch reward stats:", error);
      return reply.code(500).send({ error: "Failed to fetch reward stats" });
    }
  });
}
