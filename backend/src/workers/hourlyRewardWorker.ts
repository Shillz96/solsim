/**
 * Hourly Reward Worker
 *
 * Runs every hour at :00 to:
 * 1. Get the top 10 traders from the leaderboard (by total PnL)
 * 2. Distribute SOL rewards from the hourly pool to top 10
 * 3. Create payout records with transaction signatures
 *
 * Reward Distribution:
 * - Rank 1: 35% of pool
 * - Rank 2: 20% of pool
 * - Rank 3: 10% of pool
 * - Ranks 4-10: 5% each (35% total)
 */

import cron from "node-cron";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import prisma from "../plugins/prisma.js";
import priceService from "../plugins/priceService-optimized.js";
import { Decimal } from "@prisma/client/runtime/library";

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// Configuration
const REWARD_WALLET_SECRET = process.env.HOURLY_REWARD_WALLET_SECRET;
const HOURLY_REWARDS_ENABLED = process.env.HOURLY_REWARDS_ENABLED === "true";
const MIN_TRADES_FOR_REWARD = parseInt(process.env.MIN_TRADES_FOR_REWARD || "1");

// Reward distribution percentages (must sum to 100%)
const REWARD_SPLITS = [
  0.35, // Rank 1: 35%
  0.20, // Rank 2: 20%
  0.10, // Rank 3: 10%
  0.05, // Rank 4: 5%
  0.05, // Rank 5: 5%
  0.05, // Rank 6: 5%
  0.05, // Rank 7: 5%
  0.05, // Rank 8: 5%
  0.05, // Rank 9: 5%
  0.05  // Rank 10: 5%
];

interface TraderPerformance {
  userId: string;
  handle: string;
  walletAddress: string | null;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  totalPnL: number;
  profitPercent: number;
  tradeCount: number;
  volumeTraded: number;
}

/**
 * Check if reward worker is properly configured
 */
function isWorkerEnabled(): boolean {
  if (!HOURLY_REWARDS_ENABLED) {
    console.log("ℹ️ Hourly rewards disabled via HOURLY_REWARDS_ENABLED=false");
    return false;
  }
  if (!REWARD_WALLET_SECRET) {
    console.error("❌ HOURLY_REWARD_WALLET_SECRET not configured");
    return false;
  }
  return true;
}

/**
 * Get reward wallet keypair
 */
function getRewardWallet(): Keypair {
  if (!REWARD_WALLET_SECRET) {
    throw new Error("HOURLY_REWARD_WALLET_SECRET not configured");
  }

  try {
    const secretArray = JSON.parse(REWARD_WALLET_SECRET);
    return Keypair.fromSecretKey(new Uint8Array(secretArray));
  } catch (error) {
    throw new Error("Invalid HOURLY_REWARD_WALLET_SECRET format. Must be JSON array of 64 numbers.");
  }
}

/**
 * Get top 10 traders from leaderboard for reward distribution
 */
async function calculateHourlyProfits(): Promise<TraderPerformance[]> {
  console.log(`📊 Getting top 10 traders from leaderboard for rewards`);

  // Import the leaderboard service
  const { getLeaderboard } = await import("../services/leaderboardService.js");

  // Get top 10 from the leaderboard
  const leaderboard = await getLeaderboard(10);

  console.log(`👥 Found ${leaderboard.length} top traders`);

  // Convert leaderboard entries to TraderPerformance format
  const performances: TraderPerformance[] = [];

  for (const entry of leaderboard) {
    try {
      // Get user wallet address (required for reward distribution)
      const user = await prisma.user.findUnique({
        where: { id: entry.userId },
        select: {
          handle: true,
          walletAddress: true
        }
      });

      if (!user) {
        console.warn(`⚠️ User ${entry.userId} not found`);
        continue;
      }

      console.log(`🔍 Checking user: ${user.handle || entry.handle}`);
      console.log(`   - Has wallet: ${!!user.walletAddress}`);
      console.log(`   - Wallet: ${user.walletAddress || 'NONE'}`);
      console.log(`   - Total PnL: ${entry.totalPnlUsd}`);
      console.log(`   - Total Trades: ${entry.totalTrades}`);

      // Skip users without connected wallet (can't receive rewards)
      if (!user.walletAddress) {
        console.log(`ℹ️ Skipping ${user.handle || entry.handle} - no wallet connected`);
        continue;
      }

      // Use leaderboard data (already has totalPnL calculated)
      const totalPnL = parseFloat(entry.totalPnlUsd);
      const volumeTraded = parseFloat(entry.totalVolumeUsd);
      const profitPercent = volumeTraded > 0 ? (totalPnL / volumeTraded) * 100 : 0;

      // Add to performances list
      performances.push({
        userId: entry.userId,
        handle: user.handle || entry.handle || 'Unknown',
        walletAddress: user.walletAddress,
        totalRealizedPnL: totalPnL, // Using total PnL from leaderboard
        totalUnrealizedPnL: 0, // Not separated in leaderboard
        totalPnL,
        profitPercent,
        tradeCount: entry.totalTrades,
        volumeTraded
      });
    } catch (error) {
      console.error(`❌ Error processing user ${entry.userId}:`, error);
    }
  }

  // Already sorted by leaderboard ranking (top PnL), no need to re-sort
  return performances;
}

/**
 * Distribute rewards to top 10 traders
 */
async function distributeRewards(
  poolId: string,
  poolAmount: number,
  winners: TraderPerformance[]
): Promise<void> {
  if (poolAmount <= 0) {
    console.warn("⚠️ Pool amount is 0 or negative, skipping distribution");
    return;
  }

  if (winners.length === 0) {
    console.warn("⚠️ No eligible winners, skipping distribution");
    return;
  }

  console.log(`💰 Distributing ${poolAmount} SOL to ${winners.length} winners`);

  const rewardWallet = getRewardWallet();
  const rewardWalletBalance = await connection.getBalance(rewardWallet.publicKey);
  const rewardWalletSOL = rewardWalletBalance / LAMPORTS_PER_SOL;

  if (rewardWalletSOL < poolAmount) {
    console.error(`❌ Insufficient balance in reward wallet!`);
    console.error(`   Required: ${poolAmount} SOL`);
    console.error(`   Available: ${rewardWalletSOL} SOL`);

    // Create failed payout records
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      const rewardAmount = poolAmount * REWARD_SPLITS[i];

      await prisma.hourlyRewardPayout.create({
        data: {
          poolId,
          userId: winner.userId,
          rank: i + 1,
          profitPercentage: winner.profitPercent,
          rewardAmount,
          walletAddress: winner.walletAddress!,
          status: "FAILED",
          errorMessage: "Insufficient balance in reward wallet"
        }
      });
    }
    return;
  }

  // Distribute rewards to each winner
  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];
    const rewardAmount = poolAmount * REWARD_SPLITS[i];
    const lamports = Math.floor(rewardAmount * LAMPORTS_PER_SOL);

    try {
      console.log(`   ${i + 1}. ${winner.handle}: ${rewardAmount.toFixed(6)} SOL (${winner.profitPercent.toFixed(2)}% profit)`);

      const recipientPubkey = new PublicKey(winner.walletAddress!);

      // Create and send transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: rewardWallet.publicKey,
          toPubkey: recipientPubkey,
          lamports
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [rewardWallet],
        { commitment: "confirmed" }
      );

      console.log(`      ✅ Sent! Tx: ${signature.slice(0, 16)}...`);

      // Create successful payout record
      await prisma.hourlyRewardPayout.create({
        data: {
          poolId,
          userId: winner.userId,
          rank: i + 1,
          profitPercentage: winner.profitPercent,
          rewardAmount,
          walletAddress: winner.walletAddress!,
          txSignature: signature,
          status: "COMPLETED",
          processedAt: new Date()
        }
      });
    } catch (error: any) {
      console.error(`      ❌ Failed to send to ${winner.handle}:`, error.message);

      // Create failed payout record
      await prisma.hourlyRewardPayout.create({
        data: {
          poolId,
          userId: winner.userId,
          rank: i + 1,
          profitPercentage: winner.profitPercent,
          rewardAmount,
          walletAddress: winner.walletAddress!,
          status: "FAILED",
          errorMessage: error.message
        }
      });
    }
  }
}

/**
 * Main hourly distribution function
 */
export async function runHourlyDistribution(): Promise<void> {
  if (!isWorkerEnabled()) {
    console.log("⏭️ Hourly distribution skipped - worker not enabled");
    return;
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎰 HOURLY REWARDS DISTRIBUTION STARTED");
  console.log("=".repeat(60));

  try {
    const now = new Date();
    const lastHourStart = new Date(now);
    lastHourStart.setHours(now.getHours() - 1, 0, 0, 0);
    const lastHourEnd = new Date(lastHourStart);
    lastHourEnd.setHours(lastHourStart.getHours() + 1);

    // Find the pool for the last completed hour
    const pool = await prisma.hourlyRewardPool.findFirst({
      where: {
        hourStart: lastHourStart,
        distributed: false
      }
    });

    if (!pool) {
      console.log("ℹ️ No pool found for last hour, creating empty pool");

      // Create an empty pool to mark the hour as processed
      await prisma.hourlyRewardPool.create({
        data: {
          hourStart: lastHourStart,
          hourEnd: lastHourEnd,
          totalCreatorRewards: 0,
          poolAmount: 0,
          platformAmount: 0,
          distributed: true,
          distributedAt: new Date()
        }
      });

      console.log("✅ No fees collected, marked as distributed");
      return;
    }

    const poolAmount = parseFloat(pool.poolAmount.toString());
    console.log(`💰 Pool amount for ${lastHourStart.toISOString()}: ${poolAmount} SOL`);

    // Calculate profits and find winners
    const performances = await calculateHourlyProfits();
    const winners = performances.slice(0, 10); // Top 10 only

    console.log(`\n🏆 TOP 10 WINNERS:`);
    winners.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w.handle}: ${w.profitPercent.toFixed(2)}% (${w.tradeCount} trades)`);
    });

    if (winners.length === 0) {
      console.log("\nℹ️ No eligible winners this hour");

      // Mark pool as distributed (with no payouts)
      await prisma.hourlyRewardPool.update({
        where: { id: pool.id },
        data: {
          distributed: true,
          distributedAt: new Date()
        }
      });

      return;
    }

    // Distribute rewards
    await distributeRewards(pool.id, poolAmount, winners);

    // Mark pool as distributed
    await prisma.hourlyRewardPool.update({
      where: { id: pool.id },
      data: {
        distributed: true,
        distributedAt: new Date()
      }
    });

    console.log("\n✅ Hourly distribution completed successfully!");
  } catch (error: any) {
    console.error("\n❌ Hourly distribution failed:", error);
    throw error;
  } finally {
    console.log("=".repeat(60) + "\n");
  }
}

/**
 * Start the hourly reward worker cron job
 */
export function startHourlyRewardWorker(): void {
  if (!isWorkerEnabled()) {
    console.log("⏭️ Hourly reward worker disabled");
    return;
  }

  console.log("🚀 Starting hourly reward worker (runs at :00 every hour)");

  // Run at minute 0 of every hour (e.g., 1:00, 2:00, 3:00, etc.)
  cron.schedule("0 * * * *", async () => {
    try {
      await runHourlyDistribution();
    } catch (error) {
      console.error("❌ Hourly distribution cron job failed:", error);
    }
  });

  console.log("✅ Hourly reward worker started successfully");
}

// For manual testing
export async function testDistribution(): Promise<void> {
  console.log("🧪 Running test distribution (manual trigger)");
  await runHourlyDistribution();
}
