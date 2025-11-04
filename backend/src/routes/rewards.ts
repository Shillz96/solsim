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
      app.log.error({ error }, "Failed to calculate next distribution");
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
      app.log.error({ error }, "Failed to fetch last distribution");
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
      app.log.error({ error }, "Failed to fetch current pool");
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
      app.log.error({ error }, "Failed to fetch user winnings");
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
      app.log.error({ error }, "Failed to fetch reward stats");
      return reply.code(500).send({ error: "Failed to fetch reward stats" });
    }
  });

  // =====================================================
  // ADMIN / TESTING ENDPOINTS
  // =====================================================

  /**
   * GET /rewards/admin/debug-leaderboard
   * Debug endpoint to check leaderboard and wallet data
   */
  app.get("/admin/debug-leaderboard", async (req, reply) => {
    try {
      // Import the leaderboard service
      const { getLeaderboard } = await import("../services/leaderboardService.js");

      // Get top 10 from the leaderboard
      const leaderboard = await getLeaderboard(10);

      const debugData = [];

      for (const entry of leaderboard) {
        // Get user wallet address
        const user = await prisma.user.findUnique({
          where: { id: entry.userId },
          select: {
            handle: true,
            walletAddress: true
          }
        });

        debugData.push({
          userId: entry.userId,
          handle: entry.handle,
          userRecord: user,
          hasWallet: !!user?.walletAddress,
          walletAddress: user?.walletAddress || 'NONE',
          totalPnl: entry.totalPnlUsd,
          totalTrades: entry.totalTrades,
          rank: entry.rank
        });
      }

      return {
        success: true,
        leaderboardCount: leaderboard.length,
        usersWithWallets: debugData.filter(u => u.hasWallet).length,
        debugData
      };
    } catch (error: any) {
      app.log.error({ error }, "Failed to fetch debug data");
      return reply.code(500).send({ error: "Failed to fetch debug data" });
    }
  });

  /**
   * POST /rewards/admin/test-distribution
   * Manually trigger hourly distribution for testing
   * Requires ADMIN_KEY in request body
   */
  app.post("/admin/test-distribution", async (req, reply) => {
    const { adminKey } = req.body as { adminKey?: string };

    // Verify admin key
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return reply.code(403).send({ error: "Unauthorized: Invalid admin key" });
    }

    try {
      app.log.info("🧪 Manual test distribution triggered by admin");

      // Import and run the distribution function
      const { runHourlyDistribution } = await import("../workers/hourlyRewardWorker.js");
      await runHourlyDistribution();

      return {
        success: true,
        message: "Test distribution completed successfully",
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      app.log.error({ error }, "❌ Test distribution failed");
      return reply.code(500).send({
        error: "Test distribution failed",
        message: error.message
      });
    }
  });

  /**
   * POST /rewards/admin/inject-fees
   * Manually inject fees into current hour's pool for testing
   * Requires ADMIN_KEY in request body
   */
  app.post("/admin/inject-fees", async (req, reply) => {
    const { adminKey, amountSOL } = req.body as { adminKey?: string; amountSOL?: number };

    // Verify admin key
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return reply.code(403).send({ error: "Unauthorized: Invalid admin key" });
    }

    if (!amountSOL || amountSOL <= 0) {
      return reply.code(400).send({ error: "amountSOL must be a positive number" });
    }

    try {
      app.log.info(`🧪 Injecting ${amountSOL} SOL into reward pool`);

      // Import and use the fee collector
      const { recordCreatorFees } = await import("../services/pumpfunRewardCollector.js");
      const result = await recordCreatorFees(amountSOL, "manual-test");

      return {
        success: result.success,
        message: "Fees injected successfully",
        totalFees: result.totalFees,
        poolAmount: result.hourlyPoolAmount,
        platformAmount: result.platformAmount,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      app.log.error({ error }, "❌ Fee injection failed");
      return reply.code(500).send({
        error: "Fee injection failed",
        message: error.message
      });
    }
  });

  /**
   * GET /rewards/admin/system-status
   * Check if reward system is properly configured
   */
  app.get("/admin/system-status", async (req, reply) => {
    try {
      const hasWalletSecret = !!process.env.HOURLY_REWARD_WALLET_SECRET;
      const isEnabled = process.env.HOURLY_REWARDS_ENABLED === "true";
      const hasPumpFunWallet = !!process.env.PUMPFUN_CREATOR_WALLET;
      const hasPlatformWallet = !!process.env.PLATFORM_OWNER_WALLET;
      const minTrades = parseInt(process.env.MIN_TRADES_FOR_REWARD || "1");

      // Check if we can load the wallet
      let walletAddress = null;
      let walletBalance = null;
      let canSign = false;

      if (hasWalletSecret) {
        try {
          const { Keypair, Connection, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
          const secretArray = JSON.parse(process.env.HOURLY_REWARD_WALLET_SECRET!);
          const wallet = Keypair.fromSecretKey(new Uint8Array(secretArray));
          walletAddress = wallet.publicKey.toBase58();
          canSign = true;

          // Check balance
          const RPC_URL = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
          const connection = new Connection(RPC_URL, "confirmed");
          const balance = await connection.getBalance(wallet.publicKey);
          walletBalance = (balance / LAMPORTS_PER_SOL).toFixed(6);
        } catch (error: any) {
          app.log.error({ error }, "Failed to load reward wallet");
        }
      }

      return {
        configured: hasWalletSecret && isEnabled,
        enabled: isEnabled,
        configuration: {
          rewardWallet: hasWalletSecret ? "✅ Configured" : "❌ Missing",
          walletAddress: walletAddress || "Not available",
          walletBalance: walletBalance ? `${walletBalance} SOL` : "Not available",
          canSignTransactions: canSign,
          pumpFunWallet: hasPumpFunWallet ? "✅ Configured" : "⚠️ Optional",
          platformWallet: hasPlatformWallet ? "✅ Configured" : "⚠️ Optional",
          minTradesRequired: minTrades
        },
        status: hasWalletSecret && isEnabled ? "✅ READY" : "⚠️ NOT CONFIGURED"
      };
    } catch (error: any) {
      app.log.error({ error }, "Failed to check system status");
      return reply.code(500).send({ error: "Failed to check system status" });
    }
  });

  // =====================================================
  // SOCIAL REWARDS ENDPOINTS
  // =====================================================

  /**
   * GET /rewards/social/status
   * Get social sharing reward status for current user
   */
  app.get("/social/status", async (req, reply) => {
    try {
      // For now, return a default response since this feature might not be fully implemented
      // TODO: Implement actual social rewards tracking
      return {
        shareCount: 0,
        remainingShares: 3, // Example: 3 shares per week
        canClaim: false,
        totalRewarded: 0,
        lastClaimDate: null,
        nextClaimAvailable: null,
        weeklyShares: 0,
        lastShareTime: null
      };
    } catch (error: any) {
      app.log.error({ error }, "Failed to get social reward status");
      return reply.code(500).send({ error: "Failed to get social reward status" });
    }
  });

  /**
   * POST /rewards/social/track-share
   * Track a PnL card share event
   */
  app.post("/social/track-share", async (req, reply) => {
    try {
      // For now, return a default response since this feature might not be fully implemented
      // TODO: Implement actual social share tracking logic
      return {
        shareCount: 1,
        remainingShares: 2,
        canClaim: false,
        totalRewarded: 0,
        lastClaimDate: null,
        nextClaimAvailable: null,
        weeklyShares: 1,
        lastShareTime: new Date(),
        message: "Share tracked successfully!"
      };
    } catch (error: any) {
      app.log.error({ error }, "Failed to track social share");
      return reply.code(500).send({ error: "Failed to track social share" });
    }
  });

  /**
   * POST /rewards/social/claim
   * Claim virtual SOL reward (requires 3 shares)
   */
  app.post("/social/claim", async (req, reply) => {
    try {
      // For now, return a default response since this feature might not be fully implemented
      // TODO: Implement actual claim logic with user balance updates
      return {
        success: false,
        amountAwarded: 0,
        newBalance: 50000, // Example balance in lamports
        nextClaimAvailable: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        message: "You need 3 shares to claim a reward. Keep sharing!"
      };
    } catch (error: any) {
      app.log.error({ error }, "Failed to claim social reward");
      return reply.code(500).send({ error: "Failed to claim social reward" });
    }
  });
}
