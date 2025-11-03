/**
 * Reward Service - Track trading activity and reward points
 *
 * This is a stub implementation. Reward points are tracked in the User model
 * but not yet actively used for any gamification features.
 *
 * Future enhancements could include:
 * - Leaderboards based on reward points
 * - Unlockable badges or achievements
 * - Premium feature access based on activity
 */

import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../plugins/prisma.js";

/**
 * Add reward points to a user based on trade value
 *
 * Current implementation: No-op (stub for future feature)
 * Points are calculated as 1 point per $1 traded but not currently stored
 *
 * @param userId - User ID to award points to
 * @param tradeValueUsd - USD value of the trade
 */
export async function addTradePoints(
  userId: string,
  tradeValueUsd: Decimal
): Promise<void> {
  try {
    // FUTURE: Implement reward points system
    // For now, this is a no-op to prevent build errors

    // Potential implementation:
    // const points = tradeValueUsd.toNumber();
    // await prisma.user.update({
    //   where: { id: userId },
    //   data: {
    //     rewardPoints: { increment: points }
    //   }
    // });
  } catch (error) {
    // Silently fail - reward points are not critical to trading
    console.warn(`[RewardService] Failed to add trade points for user ${userId}:`, error);
  }
}

/**
 * Get user's current reward points
 *
 * @param userId - User ID
 * @returns Current reward points balance
 */
export async function getUserRewardPoints(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { rewardPoints: true }
    });

    return user?.rewardPoints?.toNumber() || 0;
  } catch (error) {
    console.warn(`[RewardService] Failed to get reward points for user ${userId}:`, error);
    return 0;
  }
}
