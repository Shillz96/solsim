/**
 * Badge Service
 * 
 * Handles badge awarding logic, user badge management, and badge-related operations
 * with Mario theme integration and automated achievement detection.
 */

import prisma from '../plugins/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: string;
  category: string;
  isVisible: boolean;
  requirements?: any;
  createdAt: Date;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  isActive: boolean;
  badge: Badge;
}

export interface AwardBadgeResult {
  success: boolean;
  badge?: Badge;
  error?: string;
}

export class BadgeService {
  /**
   * Award a badge to a user
   */
  static async awardBadge(userId: string, badgeName: string): Promise<AwardBadgeResult> {
    try {
      // Find the badge
      const badge = await prisma.badge.findUnique({
        where: { name: badgeName }
      });

      if (!badge) {
        return { success: false, error: 'Badge not found' };
      }

      // Check if user already has this badge
      const existingBadge = await prisma.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId,
            badgeId: badge.id
          }
        }
      });

      if (existingBadge) {
        return { success: false, error: 'User already has this badge' };
      }

      // Award the badge
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
          isActive: true
        }
      });

      return { success: true, badge };
    } catch (error: any) {
      console.error('Error awarding badge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all badges for a user
   */
  static async getUserBadges(userId: string, activeOnly: boolean = false): Promise<UserBadge[]> {
    const whereClause: any = { userId };
    if (activeOnly) {
      whereClause.isActive = true;
    }

    return await prisma.userBadge.findMany({
      where: whereClause,
      include: {
        badge: true
      },
      orderBy: { earnedAt: 'desc' }
    });
  }

  /**
   * Get a specific badge by ID
   */
  static async getBadgeById(badgeId: string): Promise<Badge | null> {
    return await prisma.badge.findUnique({
      where: { id: badgeId }
    });
  }

  /**
   * Get all available badges
   */
  static async getAllBadges(): Promise<Badge[]> {
    return await prisma.badge.findMany({
      where: { isVisible: true },
      orderBy: [
        { category: 'asc' },
        { rarity: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Activate a user's badge
   */
  static async activateUserBadge(userId: string, userBadgeId: string): Promise<boolean> {
    try {
      await prisma.userBadge.update({
        where: { id: userBadgeId },
        data: { isActive: true }
      });
      return true;
    } catch (error) {
      console.error('Error activating badge:', error);
      return false;
    }
  }

  /**
   * Deactivate a user's badge
   */
  static async deactivateUserBadge(userId: string, userBadgeId: string): Promise<boolean> {
    try {
      await prisma.userBadge.update({
        where: { id: userBadgeId },
        data: { isActive: false }
      });
      return true;
    } catch (error) {
      console.error('Error deactivating badge:', error);
      return false;
    }
  }

  /**
   * Toggle badge visibility
   */
  static async toggleBadgeVisibility(userId: string, badgeId: string): Promise<boolean> {
    try {
      const userBadge = await prisma.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId,
            badgeId
          }
        }
      });

      if (!userBadge) {
        return false;
      }

      await prisma.userBadge.update({
        where: { id: userBadge.id },
        data: { isActive: !userBadge.isActive }
      });

      return true;
    } catch (error) {
      console.error('Error toggling badge visibility:', error);
      return false;
    }
  }

  /**
   * Get badge statistics for a user
   */
  static async getBadgeStats(userId: string): Promise<{
    totalBadges: number;
    activeBadges: number;
    badgesByRarity: Record<string, number>;
    badgesByCategory: Record<string, number>;
    recentBadges: UserBadge[];
  }> {
    const userBadges = await this.getUserBadges(userId, false);
    const activeBadges = userBadges.filter(ub => ub.isActive);

    const badgesByRarity = userBadges.reduce((acc: Record<string, number>, ub) => {
      const rarity = ub.badge.rarity;
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const badgesByCategory = userBadges.reduce((acc: Record<string, number>, ub) => {
      const category = ub.badge.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentBadges = userBadges
      .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime())
      .slice(0, 5);

    return {
      totalBadges: userBadges.length,
      activeBadges: activeBadges.length,
      badgesByRarity,
      badgesByCategory,
      recentBadges
    };
  }

  /**
   * Get badge leaderboard
   */
  static async getBadgeLeaderboard(limit: number = 10): Promise<any[]> {
    const leaderboard = await prisma.userBadge.groupBy({
      by: ['userId'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit
    });

    const result = await Promise.all(
      leaderboard.map(async (item: any) => {
        const user = await prisma.user.findUnique({
          where: { id: item.userId },
          select: { handle: true, avatarUrl: true }
        });

        return {
          userId: item.userId,
          handle: user?.handle || 'Unknown',
          avatarUrl: user?.avatarUrl,
          badgeCount: item._count.id
        };
      })
    );

    return result;
  }

  /**
   * Check and award founder badges
   */
  static async checkFounderBadges(userId: string): Promise<Badge[]> {
    const newBadges: Badge[] = [];

    // Get user creation order
    const userCount = await prisma.user.count({
      where: {
        createdAt: {
          lte: await prisma.user.findUnique({
            where: { id: userId },
            select: { createdAt: true }
          }).then(user => user?.createdAt)
        }
      }
    });

    // Award founder badges based on user count
    if (userCount <= 10) {
      const result = await this.awardBadge(userId, 'Founder');
      if (result.success && result.badge) {
        newBadges.push(result.badge);
      }
    } else if (userCount <= 100) {
      const result = await this.awardBadge(userId, 'Early Adopter');
      if (result.success && result.badge) {
        newBadges.push(result.badge);
      }
    }

    return newBadges;
  }

  /**
   * Check and award trading-related badges
   */
  static async checkTradingBadges(userId: string, trade: any): Promise<Badge[]> {
    const newBadges: Badge[] = [];

    // Check profit master badge
    if (trade.realizedPnL && trade.realizedPnL >= 1000) {
      const result = await this.awardBadge(userId, 'Profit Master');
      if (result.success && result.badge) {
        newBadges.push(result.badge);
      }
    }

    // Check speed demon badge
    const tokenAge = Date.now() - new Date(trade.createdAt).getTime();
    if (tokenAge < 60000) { // Within 1 minute
      const result = await this.awardBadge(userId, 'Speed Demon');
      if (result.success && result.badge) {
        newBadges.push(result.badge);
      }
    }

    // Check hot streak badge
    const recentTrades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const profitableCount = recentTrades.filter((t: any) => t.realizedPnL && t.realizedPnL > 0).length;
    if (profitableCount >= 5) {
      const result = await this.awardBadge(userId, 'Hot Streak');
      if (result.success && result.badge) {
        newBadges.push(result.badge);
      }
    }

    return newBadges;
  }

  /**
   * Check and award community-related badges
   */
  static async checkCommunityBadges(userId: string, message: any): Promise<Badge[]> {
    const newBadges: Badge[] = [];

    // Check chat champion badge
    const messageCount = await prisma.chatMessage.count({
      where: { userId }
    });

    if (messageCount >= 100) {
      const result = await this.awardBadge(userId, 'Chat Champion');
      if (result.success && result.badge) {
        newBadges.push(result.badge);
      }
    }

    return newBadges;
  }

  /**
   * Check and award all possible badges for a user
   */
  static async checkAllBadges(userId: string): Promise<Badge[]> {
    const newBadges: Badge[] = [];

    // Check founder badges
    const founderBadges = await this.checkFounderBadges(userId);
    newBadges.push(...founderBadges);

    // Check community badges
    const communityBadges = await this.checkCommunityBadges(userId, null);
    newBadges.push(...communityBadges);

    return newBadges;
  }
}