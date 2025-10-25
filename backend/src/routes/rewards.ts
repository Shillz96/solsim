// Rewards routes for VSOL token claims
import { FastifyInstance } from "fastify";
import prisma from "../plugins/prisma.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { claimReward, isRewardSystemEnabled } from "../services/rewardService.js";

// Initialize Solana connection
const RPC_URL = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// REMOVED: Token holder verification requirement
// Users no longer need to hold vSOL tokens to claim their earned rewards
// This was creating a barrier where users needed to buy tokens before claiming rewards

export default async function rewardsRoutes(app: FastifyInstance) {
  // Claim VSOL rewards
  app.post("/claim", async (req, reply) => {
    const { userId, epoch, wallet } = req.body as {
      userId: string;
      epoch: number;
      wallet: string;
    };
    
    if (!userId || !epoch || !wallet) {
      return reply.code(400).send({ error: "userId, epoch, and wallet required" });
    }
    
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return reply.code(403).send({
          error: "Email verification required",
          message: "Please verify your email address before claiming rewards"
        });
      }

      // REMOVED: 5-minute cooldown and epoch restrictions
      // Users can now claim rewards whenever they have earned them, multiple times per day
      
      // Calculate reward amount based on user's performance metrics
      const [tradeCount, totalVolume, winRate] = await Promise.all([
        prisma.trade.count({ where: { userId } }),
        prisma.trade.aggregate({
          where: { userId },
          _sum: { totalCost: true }
        }),
        prisma.realizedPnL.aggregate({
          where: { userId, pnl: { gt: 0 } },
          _count: { id: true }
        })
      ]);
      
      const totalTrades = await prisma.trade.count({ where: { userId } });
      const winRatePercent = totalTrades > 0 ? (winRate._count.id / totalTrades) * 100 : 0;
      const volumeUsd = parseFloat(totalVolume._sum.totalCost?.toString() || "0");
      
      // Reward calculation: 1 point = 1000 vSOL
      let rewardPoints = 0;
      rewardPoints += tradeCount * 1; // 1 point per trade
      rewardPoints += Math.floor(volumeUsd / 100) * 2; // 2 points per $100 volume
      rewardPoints += Math.floor(winRatePercent / 10) * 10; // 10 points per 10% win rate

      // Calculate vSOL amount: points * 1000
      const rewardAmount = rewardPoints * 1000;

      // Cap at 200,000 vSOL per claim (200 points * 1000)
      const cappedRewardAmount = Math.min(rewardAmount, 200000);
      
      // If reward amount is 0, return error
      if (cappedRewardAmount === 0) {
        return reply.code(400).send({
          error: "No rewards available",
          message: "You don't have enough trading activity to claim rewards yet. Start trading to earn rewards!"
        });
      }
      
      // Create reward claim record using timestamp to avoid unique constraint issues
      // Since we removed epoch restrictions, use timestamp as epoch for uniqueness
      const timestampEpoch = Date.now();
      
      const [claim] = await prisma.$transaction([
        prisma.rewardClaim.create({
          data: {
            userId,
            epoch: timestampEpoch, // Use timestamp to ensure uniqueness
            wallet,
            amount: cappedRewardAmount,
            status: "PENDING"
          }
        }),
        prisma.user.update({
          where: { id: userId },
          data: { lastClaimTime: new Date() }
        })
      ]);

      // Immediately process the claim by sending tokens on-chain
      try {
        app.log.info(`Attempting to send ${cappedRewardAmount} vSOL (${rewardPoints} points) to wallet ${wallet}`);
        const result = await claimReward(userId, parseInt(epoch.toString()), wallet);
        app.log.info(`Successfully sent tokens! Transaction: ${result.sig}`);
        
        return {
          claimId: claim.id,
          amount: cappedRewardAmount.toString(),
          points: rewardPoints,
          status: "COMPLETED",
          txSig: result.sig,
          message: "Rewards claimed successfully! Tokens have been sent to your wallet."
        };
      } catch (claimError: any) {
        app.log.error("Failed to process claim on-chain:", claimError);
        app.log.error(`Error details - User: ${userId}, Wallet: ${wallet}, Amount: ${cappedRewardAmount}, Points: ${rewardPoints}, Message: ${claimError.message}`);
        
        // Check if it's a configuration error
        const isConfigError = claimError.message?.includes("not configured") || 
                             claimError.message?.includes("VSOL_TOKEN_MINT") ||
                             claimError.message?.includes("REWARDS_WALLET");
        
        if (isConfigError) {
          // Delete the claim since it can't be processed
          await prisma.rewardClaim.delete({ where: { id: claim.id } });
          
          // Reset lastClaimTime so they can try again later
          await prisma.user.update({
            where: { id: userId },
            data: { lastClaimTime: null }
          });
          
          return reply.code(503).send({
            error: "Reward system not configured",
            message: "The reward distribution system is not yet set up. Please contact support or try again later.",
            details: claimError.message
          });
        }
        
        // Return success but indicate tokens are pending for other errors
        return {
          claimId: claim.id,
          amount: cappedRewardAmount.toString(),
          points: rewardPoints,
          status: "PENDING",
          message: "Reward claim created but token transfer failed. Our team will process this manually. Error: " + claimError.message
        };
      }
      
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to claim rewards" });
    }
  });

  // Get user's reward claims
  app.get("/claims/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    try {
      const claims = await prisma.rewardClaim.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      
      return { claims };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch claims" });
    }
  });

  // Admin/Cron: Create reward snapshot
  app.post("/snapshot", async (req, reply) => {
    const { epoch, adminKey } = req.body as {
      epoch: number;
      adminKey: string;
    };
    
    // Simple admin key check (in production use proper auth)
    if (adminKey !== process.env.ADMIN_KEY) {
      return reply.code(403).send({ error: "Unauthorized" });
    }
    
    try {
      // Calculate rewards for all eligible users
      const users = await prisma.user.findMany({
        include: {
          trades: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          },
          positions: true
        }
      });
      
      // Calculate total points for the epoch
      let totalPoints = 0;
      for (const user of users) {
        const tradeCount = user.trades.length;
        const positionCount = user.positions.length;
        
        // Calculate points based on activity
        let userPoints = 0;
        if (tradeCount > 0) userPoints += tradeCount * 5;
        if (positionCount > 0) userPoints += positionCount * 2;
        
        totalPoints += userPoints;
      }
      
      // Default pool amount (can be configured) - scaled for daily
      const poolAmount = 1000; // 1,000 VSOL tokens per day
      
      // Store snapshot for this epoch
      await prisma.rewardSnapshot.create({
        data: {
          epoch: parseInt(epoch.toString()),
          totalPoints,
          poolAmount
        }
      });
      
      return {
        epoch: parseInt(epoch.toString()),
        totalPoints,
        poolAmount
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to create snapshot" });
    }
  });

  // Get reward statistics
  app.get("/stats", async (req, reply) => {
    try {
      const [totalClaims, totalAmount, pendingClaims] = await Promise.all([
        prisma.rewardClaim.count(),
        prisma.rewardClaim.aggregate({
          _sum: { amount: true }
        }),
        prisma.rewardClaim.count({
          where: { status: "PENDING" }
        })
      ]);
      
      return {
        totalClaims,
        totalAmount: totalAmount._sum.amount || 0,
        pendingClaims
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch reward stats" });
    }
  });

  // Check reward system configuration status
  app.get("/system-status", async (req, reply) => {
    try {
      const isConfigured = isRewardSystemEnabled();
      const hasMint = !!process.env.VSOL_TOKEN_MINT;
      const hasWallet = !!process.env.REWARDS_WALLET_SECRET;
      
      return {
        enabled: isConfigured,
        configured: {
          tokenMint: hasMint,
          rewardsWallet: hasWallet
        },
        message: isConfigured 
          ? "Reward system is fully configured and operational"
          : "Reward system requires configuration. Set VSOL_TOKEN_MINT and REWARDS_WALLET_SECRET environment variables."
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to check system status" });
    }
  });

  // Retry failed/pending claims
  app.post("/retry-claim", async (req, reply) => {
    const { userId, epoch, wallet } = req.body as {
      userId: string;
      epoch: number;
      wallet: string;
    };

    if (!userId || !epoch || !wallet) {
      return reply.code(400).send({ error: "userId, epoch, and wallet required" });
    }

    try {
      // Find the existing claim
      const claim = await prisma.rewardClaim.findUnique({
        where: {
          userId_epoch: {
            userId,
            epoch: parseInt(epoch.toString())
          }
        }
      });

      if (!claim) {
        return reply.code(404).send({ error: "No claim found for this epoch" });
      }

      // If already completed, return the existing transaction
      if (claim.status === "COMPLETED" && claim.txSig) {
        return {
          message: "Claim already completed",
          txSig: claim.txSig,
          amount: claim.amount.toString(),
          status: "COMPLETED"
        };
      }

      // Retry the claim
      app.log.info(`Retrying claim for user ${userId}, epoch ${epoch}`);

      try {
        const result = await claimReward(userId, epoch, wallet);

        return {
          message: "Claim processed successfully!",
          txSig: result.sig,
          amount: claim.amount.toString(),
          status: "COMPLETED"
        };
      } catch (retryError: any) {
        app.log.error("Retry claim failed:", retryError);
        return reply.code(500).send({
          error: "Failed to process claim",
          message: retryError.message,
          details: "The claim exists but token transfer failed. Please contact support."
        });
      }

    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to retry claim" });
    }
  });

  // =====================================================
  // HOURLY REWARDS ENDPOINTS (NEW SYSTEM)
  // =====================================================

  // Get seconds until next hourly distribution
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

  // Get last hourly distribution with winners (MOCK DATA for now)
  app.get("/hourly/last-distribution", async (req, reply) => {
    try {
      // TODO: Replace with real data from HourlyRewardPayout table when worker is running
      // For now, return mock data so frontend can be built and tested

      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1, 0, 0, 0);

      const mockWinners = [
        {
          rank: 1,
          userId: "mock-user-1",
          handle: "TradeKing",
          avatarUrl: null,
          profitPercent: "127.5",
          rewardAmount: "0.035",
          walletAddress: "DemoWallet1111111111111111111111111111",
          txSignature: "5j7s8K9mN3pQ4rT6vX8yZ1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4",
          status: "COMPLETED"
        },
        {
          rank: 2,
          userId: "mock-user-2",
          handle: "MoonShot",
          avatarUrl: null,
          profitPercent: "98.3",
          rewardAmount: "0.020",
          walletAddress: "DemoWallet2222222222222222222222222222",
          txSignature: "6k8t9L0nO4pR5sU7wY9zA2bC3dE4fG5hI6jK7lM8nO9pQ0rS1tU2vW3xY4zA",
          status: "COMPLETED"
        },
        {
          rank: 3,
          userId: "mock-user-3",
          handle: "DiamondHands",
          avatarUrl: null,
          profitPercent: "76.2",
          rewardAmount: "0.010",
          walletAddress: "DemoWallet3333333333333333333333333333",
          txSignature: "7l9u0M1oP5qS6tV8xZ0aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB",
          status: "COMPLETED"
        },
        {
          rank: 4,
          userId: "mock-user-4",
          handle: "SolanaWhale",
          avatarUrl: null,
          profitPercent: "54.8",
          rewardAmount: "0.005",
          walletAddress: "DemoWallet4444444444444444444444444444",
          txSignature: "8m0v1N2pQ6rT7uW9yA1bC4dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zA6bC",
          status: "COMPLETED"
        },
        {
          rank: 5,
          userId: "mock-user-5",
          handle: "CryptoNinja",
          avatarUrl: null,
          profitPercent: "43.1",
          rewardAmount: "0.005",
          walletAddress: "DemoWallet5555555555555555555555555555",
          txSignature: "9n1w2O3qR7sU8vX0yB2cD5eF6gH7iJ8kL9mN0oP1qR2sT3uV4wX5yZ6aB7cD",
          status: "COMPLETED"
        },
        {
          rank: 6,
          userId: "mock-user-6",
          handle: "DeFiMaster",
          avatarUrl: null,
          profitPercent: "38.7",
          rewardAmount: "0.005",
          walletAddress: "DemoWallet6666666666666666666666666666",
          txSignature: "0o2x3P4rS8tV9wY1zA3cE6fG7hI8jK9lM0nO1pQ2rS3tU4vW5xY6zA7bC8dE",
          status: "COMPLETED"
        },
        {
          rank: 7,
          userId: "mock-user-7",
          handle: "TokenHunter",
          avatarUrl: null,
          profitPercent: "32.4",
          rewardAmount: "0.005",
          walletAddress: "DemoWallet7777777777777777777777777777",
          txSignature: "1p3y4Q5sT9uW0xZ2aB4cF7gH8iJ9kL0mN1oP2qR3sT4uV5wX6yZ7aB8cD9eF",
          status: "COMPLETED"
        },
        {
          rank: 8,
          userId: "mock-user-8",
          handle: "PumpChaser",
          avatarUrl: null,
          profitPercent: "28.9",
          rewardAmount: "0.005",
          walletAddress: "DemoWallet8888888888888888888888888888",
          txSignature: "2q4z5R6tU0vX1yA3bC5cG8hI9jK0lM1nO2pQ3rS4tU5vW6xY7zA8bC9dE0fG",
          status: "COMPLETED"
        },
        {
          rank: 9,
          userId: "mock-user-9",
          handle: "ApeStrong",
          avatarUrl: null,
          profitPercent: "24.6",
          rewardAmount: "0.005",
          walletAddress: "DemoWallet9999999999999999999999999999",
          txSignature: "3r5a6S7uV1wY2zA4bD6cH9iJ0kL1mN2oP3qR4sT5uV6wX7yZ8aB9cD0eF1gH",
          status: "COMPLETED"
        },
        {
          rank: 10,
          userId: "mock-user-10",
          handle: "GemFinder",
          avatarUrl: null,
          profitPercent: "19.3",
          rewardAmount: "0.005",
          walletAddress: "DemoWallet0000000000000000000000000000",
          txSignature: "4s6b7T8vW2xZ3aB5cE7dI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1fG2hI",
          status: "COMPLETED"
        }
      ];

      return {
        poolId: "mock-pool-id",
        distributedAt: lastHour.toISOString(),
        totalPoolAmount: "0.100",
        winnersCount: 10,
        winners: mockWinners
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch last distribution" });
    }
  });
}