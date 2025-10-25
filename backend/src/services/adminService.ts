/**
 * Admin Service
 * 
 * Comprehensive admin operations for user management, analytics, and platform oversight
 */

import prisma from '../plugins/prisma.js';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalBadges: number;
  badgesAwarded: number;
  moderationActions: number;
  averageTrustScore: number;
  userGrowth24h: number;
  badgeGrowth24h: number;
}

export interface UserSearchFilters {
  tier?: string;
  minBalance?: number;
  maxBalance?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface UserSearchResult {
  id: string;
  handle: string;
  email: string;
  userTier: string;
  virtualSolBalance: number;
  createdAt: Date;
  lastActiveAt?: Date;
  badgeCount: number;
  trustScore: number;
}

export interface UserDetails {
  id: string;
  handle: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  userTier: string;
  virtualSolBalance: number;
  realSolBalance: number;
  vsolTokenBalance?: number;
  rewardPoints: number;
  emailVerified: boolean;
  walletVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    rarity: string;
    earnedAt: Date;
  }>;
  moderationStatus?: {
    trustScore: number;
    strikes: number;
    isMuted: boolean;
    mutedUntil?: Date;
    isBanned: boolean;
    bannedUntil?: Date;
  };
  stats: {
    totalTrades: number;
    totalPnL: number;
    positionsCount: number;
    copyTradesCount: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'USER_REGISTERED' | 'BADGE_AWARDED' | 'MODERATION_ACTION' | 'TRADE_EXECUTED';
  userId?: string;
  userHandle?: string;
  description: string;
  metadata?: any;
  createdAt: Date;
}

export interface Analytics {
  userGrowth: Array<{
    date: string;
    count: number;
  }>;
  badgeDistribution: Array<{
    rarity: string;
    count: number;
  }>;
  userTierDistribution: Array<{
    tier: string;
    count: number;
  }>;
  moderationTrends: Array<{
    date: string;
    actions: number;
  }>;
}

export class AdminService {
  /**
   * Get comprehensive platform statistics
   */
  static async getOverviewStats(): Promise<AdminStats> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalBadges,
      badgesAwarded,
      moderationActions,
      userGrowth24h,
      badgeGrowth24h,
      averageTrustScore
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (logged in within last 7 days)
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Total badges available
      prisma.badge.count(),
      
      // Total badges awarded
      prisma.userBadge.count(),
      
      // Total moderation actions
      prisma.chatModerationAction.count(),
      
      // User growth in last 24h
      prisma.user.count({
        where: {
          createdAt: {
            gte: yesterday
          }
        }
      }),
      
      // Badge growth in last 24h
      prisma.userBadge.count({
        where: {
          earnedAt: {
            gte: yesterday
          }
        }
      }),
      
      // Average trust score
      prisma.userModerationStatus.aggregate({
        _avg: {
          trustScore: true
        }
      }).then(result => result._avg.trustScore || 0)
    ]);

    return {
      totalUsers,
      activeUsers,
      totalBadges,
      badgesAwarded,
      moderationActions,
      averageTrustScore: Math.round(averageTrustScore),
      userGrowth24h,
      badgeGrowth24h
    };
  }

  /**
   * Search users with filters and pagination
   */
  static async searchUsers(
    query: string = '',
    filters: UserSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ users: UserSearchResult[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    // Text search
    if (query) {
      where.OR = [
        { handle: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ];
    }
    
    // Filters
    if (filters.tier) {
      where.userTier = filters.tier;
    }
    
    if (filters.minBalance !== undefined || filters.maxBalance !== undefined) {
      where.virtualSolBalance = {};
      if (filters.minBalance !== undefined) {
        where.virtualSolBalance.gte = filters.minBalance;
      }
      if (filters.maxBalance !== undefined) {
        where.virtualSolBalance.lte = filters.maxBalance;
      }
    }
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          handle: true,
          email: true,
          userTier: true,
          virtualSolBalance: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              userBadges: true
            }
          },
          userModerationStatus: {
            select: {
              trustScore: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    const userResults: UserSearchResult[] = users.map(user => ({
      id: user.id,
      handle: user.handle,
      email: user.email,
      userTier: user.userTier,
      virtualSolBalance: Number(user.virtualSolBalance),
      createdAt: user.createdAt,
      lastActiveAt: user.updatedAt,
      badgeCount: user._count.userBadges,
      trustScore: user.userModerationStatus?.trustScore || 100
    }));

    return {
      users: userResults,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get detailed user information
   */
  static async getUserDetails(userId: string): Promise<UserDetails | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBadges: {
          include: {
            badge: true
          },
          orderBy: { earnedAt: 'desc' }
        },
        userModerationStatus: true,
        _count: {
          select: {
            trades: true,
            positions: true,
            copyTrades: true
          }
        }
      }
    });

    if (!user) return null;

    // Calculate total PnL
    const totalPnL = await prisma.realizedPnL.aggregate({
      where: { userId },
      _sum: { pnlUsd: true }
    });

    return {
      id: user.id,
      handle: user.handle,
      email: user.email,
      displayName: user.displayName ?? undefined,
      bio: user.bio ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      userTier: user.userTier,
      virtualSolBalance: Number(user.virtualSolBalance),
      realSolBalance: Number(user.realSolBalance),
      vsolTokenBalance: user.vsolTokenBalance ? Number(user.vsolTokenBalance) : undefined,
      rewardPoints: Number(user.rewardPoints),
      emailVerified: user.emailVerified,
      walletVerified: user.walletVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastActiveAt: user.updatedAt,
      badges: user.userBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        icon: ub.badge.icon,
        color: ub.badge.color,
        rarity: ub.badge.rarity,
        earnedAt: ub.earnedAt
      })),
      moderationStatus: user.userModerationStatus ? {
        trustScore: user.userModerationStatus.trustScore,
        strikes: user.userModerationStatus.strikes,
        isMuted: user.userModerationStatus.isMuted,
        mutedUntil: user.userModerationStatus.mutedUntil ?? undefined,
        isBanned: user.userModerationStatus.isBanned,
        bannedUntil: user.userModerationStatus.bannedUntil ?? undefined
      } : undefined,
      stats: {
        totalTrades: user._count.trades,
        totalPnL: totalPnL._sum.pnlUsd ? Number(totalPnL._sum.pnlUsd) : 0,
        positionsCount: user._count.positions,
        copyTradesCount: user._count.copyTrades
      }
    };
  }

  /**
   * Update user tier
   */
  static async updateUserTier(userId: string, newTier: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { userTier: newTier as any }
      });
      return true;
    } catch (error) {
      console.error('Failed to update user tier:', error);
      return false;
    }
  }

  /**
   * Update user balance
   */
  static async updateUserBalance(userId: string, newBalance: number): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { virtualSolBalance: newBalance }
      });
      return true;
    } catch (error) {
      console.error('Failed to update user balance:', error);
      return false;
    }
  }

  /**
   * Get recent activity feed
   */
  static async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    const activities: RecentActivity[] = [];

    // Recent user registrations
    const recentUsers = await prisma.user.findMany({
      select: {
        id: true,
        handle: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: Math.floor(limit / 3)
    });

    activities.push(...recentUsers.map(user => ({
      id: `user-${user.id}`,
      type: 'USER_REGISTERED' as const,
      userId: user.id,
      userHandle: user.handle,
      description: `New user registered: ${user.handle}`,
      createdAt: user.createdAt
    })));

    // Recent badge awards
    const recentBadges = await prisma.userBadge.findMany({
      include: {
        badge: true,
        user: {
          select: { handle: true }
        }
      },
      orderBy: { earnedAt: 'desc' },
      take: Math.floor(limit / 3)
    });

    activities.push(...recentBadges.map(ub => ({
      id: `badge-${ub.id}`,
      type: 'BADGE_AWARDED' as const,
      userId: ub.userId,
      userHandle: ub.user.handle,
      description: `Badge earned: ${ub.badge.name}`,
      metadata: { badgeName: ub.badge.name, badgeIcon: ub.badge.icon },
      createdAt: ub.earnedAt
    })));

    // Recent moderation actions
    const recentModeration = await prisma.chatModerationAction.findMany({
      include: {
        user: {
          select: { handle: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.floor(limit / 3)
    });

    activities.push(...recentModeration.map(action => ({
      id: `mod-${action.id}`,
      type: 'MODERATION_ACTION' as const,
      userId: action.userId,
      userHandle: action.user.handle,
      description: `Moderation: ${action.action} - ${action.reason || 'No reason provided'}`,
      metadata: { action: action.action, reason: action.reason },
      createdAt: action.createdAt
    })));

    // Sort by date and limit
    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get platform analytics
   */
  static async getAnalytics(): Promise<Analytics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User growth over last 30 days
    const userGrowth = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const userGrowthByDate = userGrowth.reduce((acc, user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userGrowthArray = Object.entries(userGrowthByDate).map(([date, count]) => ({
      date,
      count
    }));

    // Badge distribution by rarity
    const badgeDistribution = await prisma.badge.groupBy({
      by: ['rarity'],
      _count: { rarity: true }
    });

    // User tier distribution
    const userTierDistribution = await prisma.user.groupBy({
      by: ['userTier'],
      _count: { userTier: true }
    });

    // Moderation trends over last 30 days
    const moderationTrends = await prisma.chatModerationAction.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const moderationByDate = moderationTrends.reduce((acc, action) => {
      const date = action.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const moderationTrendsArray = Object.entries(moderationByDate).map(([date, actions]) => ({
      date,
      actions
    }));

    return {
      userGrowth: userGrowthArray,
      badgeDistribution: badgeDistribution.map(b => ({
        rarity: b.rarity,
        count: b._count.rarity
      })),
      userTierDistribution: userTierDistribution.map(u => ({
        tier: u.userTier,
        count: u._count.userTier
      })),
      moderationTrends: moderationTrendsArray
    };
  }
}
