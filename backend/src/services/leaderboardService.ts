// Leaderboard service for ranking users by performance
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";

export interface LeaderboardEntry {
  userId: string;
  handle: string | null;
  profileImage: string | null;
  totalPnlUsd: string;
  totalTrades: number;
  winRate: number;
  totalVolumeUsd: string;
  rank: number;
}

export async function getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  // Get users with their trading performance
  const users = await prisma.user.findMany({
    include: {
      trades: {
        select: {
          costUsd: true
        }
      },
      realizedPnls: {
        select: {
          pnl: true
        }
      },
      positions: {
        where: {
          qty: { gt: 0 }
        }
      }
    }
  });

  // Calculate performance metrics for each user
  const leaderboardData = users.map((user: any) => {
    const totalTrades = user.trades.length;
    const totalVolumeUsd = user.trades.reduce((sum: number, trade: any) =>
      sum + parseFloat(trade.costUsd.toString()), 0
    );

    const totalPnlUsd = user.realizedPnl.reduce((sum: number, pnl: any) =>
      sum + parseFloat(pnl.pnlUsd.toString()), 0
    );

    const winningTrades = user.realizedPnl.filter((pnl: any) =>
      parseFloat(pnl.pnlUsd.toString()) > 0
    ).length;
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      userId: user.id,
      handle: user.handle,
      profileImage: user.profileImage,
      totalPnlUsd: totalPnlUsd.toFixed(2),
      totalTrades,
      winRate: parseFloat(winRate.toFixed(2)),
      totalVolumeUsd: totalVolumeUsd.toFixed(2),
      rank: 0 // Will be set after sorting
    };
  });

  // Sort by total PnL (descending) and assign ranks
  const sortedLeaderboard = leaderboardData
    .sort((a: any, b: any) => parseFloat(b.totalPnlUsd) - parseFloat(a.totalPnlUsd))
    .slice(0, limit)
    .map((entry: any, index: number) => ({
      ...entry,
      rank: index + 1
    }));

  return sortedLeaderboard;
}

export async function getUserRank(userId: string): Promise<number | null> {
  const leaderboard = await getLeaderboard(1000); // Get more entries to find rank
  const userEntry = leaderboard.find(entry => entry.userId === userId);
  return userEntry?.rank || null;
}

// Rollup function for updating user leaderboard data (can be called via API or background job)
export async function rollupUser(userId: string): Promise<void> {
  try {
    // This function could be used to trigger background processing of leaderboard data
    // For now, it's a placeholder that could be extended to:
    // - Recalculate user's PnL
    // - Update cached leaderboard position
    // - Trigger real-time leaderboard updates
    // - Process large datasets in batches

    console.log(`📊 Rolling up leaderboard data for user: ${userId}`);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, handle: true }
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Could add more rollup logic here in the future
    // For example: force refresh cached data, recalculate complex metrics, etc.

  } catch (error) {
    console.error(`Failed to rollup user ${userId}:`, error);
    throw error;
  }
}