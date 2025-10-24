/**
 * Badge Types
 * 
 * TypeScript interfaces for badge system
 */

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

export interface BadgeStats {
  totalBadges: number;
  activeBadges: number;
  badgesByRarity: Record<string, number>;
  badgesByCategory: Record<string, number>;
  recentBadges: UserBadge[];
}

export interface BadgeAwardResult {
  success: boolean;
  badge?: Badge;
  error?: string;
  alreadyEarned?: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  user: {
    handle: string;
    avatarUrl?: string;
  };
  badgeCount: number;
  topBadges: UserBadge[];
}
