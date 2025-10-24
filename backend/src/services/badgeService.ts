/**
 * Badge Service
 * 
 * Handles badge awarding logic, user badge management, and badge-related operations
 * with Mario theme integration and automated achievement detection.
 */

import { prisma } from '../plugins/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  category: 'FOUNDER' | 'TRADING' | 'COMMUNITY' | 'SPECIAL' | 'MODERATION';
  isVisible: boolean;
  requirements: any;
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

export interface BadgeAwardResult {
  success: boolean;
  badge?: Badge;
  error?: string;
  alreadyEarned?: boolean;
}

export class BadgeService {
  /**
   * Award a badge to a user if they meet the requirements
   */
  static async awardBadge(userId: string, badgeName: string): Promise<BadgeAwardResult> {
    try {
      // Get badge definition
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
        return { 
          success: false, 
          error: 'Badge already earned',
          alreadyEarned: true 
        };
      }

      // Check if user meets requirements
      const meetsRequirements = await this.checkBadgeRequirements(userId, badge);
      if (!meetsRequirements) {
        return { success: false, error: 'Requirements not met' };
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
   * Check if user meets badge requirements
   */
  private static async checkBadgeRequirements(userId: string, badge: Badge): Promise<boolean> {
    if (!badge.requirements) return true;

    const requirements = badge.requirements;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trades: true,
        chatMessages: true,
        userModerationStatus: true
      }
    });

    if (!user) return false;

    switch (requirements.type) {
      case 'user_count':
        const totalUsers = await prisma.user.count();
        return totalUsers <= requirements.maxUsers;

      case 'beta_user':
        // Check if user joined during beta phase (you can define your beta period)
        const betaStartDate = new Date('2024-01-01'); // Adjust as needed
        const betaEndDate = new Date('2024-06-01'); // Adjust as needed
        return user.createdAt >= betaStartDate && user.createdAt <= betaEndDate;

      case 'vsol_holder':
        const daysSinceJoin = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceJoin >= requirements.minDays;

      case 'trading_profit':
        const profitableTrades = user.trades.filter(trade => 
          trade.realizedPnL && trade.realizedPnL > 0
        );
        return profitableTrades.some(trade => 
          trade.realizedPnL && trade.realizedPnL >= requirements.minProfitPercent
        );

      case 'first_trader':
        // Check if user was first to trade a token within specified minutes
        const recentTrades = await prisma.trade.findMany({
          where: {
            mint: { in: user.trades.map(t => t.mint) },
            createdAt: {
              gte: new Date(Date.now() - requirements.maxMinutes * 60 * 1000)
            }
          },
          orderBy: { createdAt: 'asc' }
        });
        return recentTrades.some(trade => trade.userId === userId);

      case 'largest_trade':
        const allTrades = await prisma.trade.findMany({
          orderBy: { totalCost: 'desc' },
          take: 1
        });
        return allTrades.length > 0 && allTrades[0].userId === userId;

      case 'portfolio_value':
        // This would require portfolio calculation - implement based on your portfolio service
        return false; // Placeholder

      case 'consecutive_trades':
        const trades = user.trades.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        let consecutiveCount = 0;
        let maxConsecutive = 0;
        
        for (const trade of trades) {
          if (trade.realizedPnL && trade.realizedPnL > 0) {
            consecutiveCount++;
            maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
          } else {
            consecutiveCount = 0;
          }
        }
        
        return maxConsecutive >= requirements.minTrades;

      case 'prediction_accuracy':
        // This would require prediction tracking - implement based on your needs
        return false; // Placeholder

      case 'upvoted_messages':
        // This would require upvoting system - implement based on your needs
        return false; // Placeholder

      case 'all_achievements':
        // Check if user has all other badges
        const userBadgeCount = await prisma.userBadge.count({
          where: { userId }
        });
        const totalBadges = await prisma.badge.count();
        return userBadgeCount >= totalBadges - 1; // -1 to exclude this badge itself

      case 'community_activity':
        // Check chat message count, event participation, etc.
        const messageCount = await prisma.chatMessage.count({
          where: { userId }
        });
        return messageCount >= 100; // Adjust threshold as needed

      case 'popular_discussions':
        // This would require discussion tracking - implement based on your needs
        return false; // Placeholder

      case 'helped_users':
        // This would require help tracking - implement based on your needs
        return false; // Placeholder

      case 'content_engagement':
        // This would require content engagement tracking - implement based on your needs
        return false; // Placeholder

      case 'competition_winner':
        // This would require competition tracking - implement based on your needs
        return false; // Placeholder

      case 'tournament_winner':
        // This would require tournament tracking - implement based on your needs
        return false; // Placeholder

      case 'token_sharing':
        // This would require token sharing tracking - implement based on your needs
        return false; // Placeholder

      case 'event_host':
        // This would require event hosting tracking - implement based on your needs
        return false; // Placeholder

      case 'content_creation':
        // This would require content creation tracking - implement based on your needs
        return false; // Placeholder

      case 'moderator_role':
        return user.userTier === 'ADMINISTRATOR' || user.userTier === 'MODERATOR';

      case 'admin_role':
        return user.userTier === 'ADMINISTRATOR';

      case 'trust_score':
        return user.userModerationStatus?.trustScore >= requirements.minScore;

      case 'identity_verified':
        return user.walletVerified || user.emailVerified;

      case 'premium_member':
        return user.userTier === 'VSOL_HOLDER' || user.userTier === 'ADMINISTRATOR';

      default:
        return false;
    }
  }

  /**
   * Get all badges for a user
   */
  static async getUserBadges(userId: string, activeOnly: boolean = true): Promise<UserBadge[]> {
    return await prisma.userBadge.findMany({
      where: {
        userId,
        ...(activeOnly && { isActive: true })
      },
      include: {
        badge: true
      },
      orderBy: [
        { badge: { rarity: 'desc' } },
        { earnedAt: 'desc' }
      ]
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
        { rarity: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Get badges by category
   */
  static async getBadgesByCategory(category: string): Promise<Badge[]> {
    return await prisma.badge.findMany({
      where: { 
        category: category as any,
        isVisible: true 
      },
      orderBy: [
        { rarity: 'desc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Toggle badge visibility for user
   */
  static async toggleBadgeVisibility(userId: string, badgeId: string): Promise<boolean> {
    try {
      const userBadge = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId } }
      });

      if (!userBadge) return false;

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

    const profitableCount = recentTrades.filter(t => t.realizedPnL && t.realizedPnL > 0).length;
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

    // Check chat champion badge (if upvoting system exists)
    // This would require implementing upvoting system first

    // Check party host badge (if discussion tracking exists)
    // This would require implementing discussion tracking first

    return newBadges;
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

    const badgesByRarity = userBadges.reduce((acc, ub) => {
      const rarity = ub.badge.rarity;
      acc[rarity] = (acc[rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const badgesByCategory = userBadges.reduce((acc, ub) => {
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
   * Get leaderboard of users with most badges
   */
  static async getBadgeLeaderboard(limit: number = 10): Promise<Array<{
    userId: string;
    user: { handle: string; avatarUrl?: string };
    badgeCount: number;
    topBadges: UserBadge[];
  }>> {
    const leaderboard = await prisma.userBadge.groupBy({
      by: ['userId'],
      _count: { id: true },
      where: { isActive: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit
    });

    const result = await Promise.all(
      leaderboard.map(async (item) => {
        const user = await prisma.user.findUnique({
          where: { id: item.userId },
          select: { handle: true, avatarUrl: true }
        });

        const topBadges = await prisma.userBadge.findMany({
          where: { userId: item.userId, isActive: true },
          include: { badge: true },
          orderBy: { badge: { rarity: 'desc' } },
          take: 3
        });

        return {
          userId: item.userId,
          user: user || { handle: 'Unknown' },
          badgeCount: item._count.id,
          topBadges
        };
      })
    );

    return result;
  }
}
