/**
 * Admin API Hooks
 * 
 * React Query hooks for admin API operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';

// Types
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

export interface ModerationConfig {
  rateLimit: {
    messagesPerWindow: number;
    windowSeconds: number;
    burstLimit: number;
  };
  spam: {
    repeatedCharThreshold: number;
    duplicateMessageWindow: number;
    duplicateMessageThreshold: number;
  };
  toxicity: {
    enabled: boolean;
    confidenceThreshold: number;
    severityThreshold: string;
  };
  pumpDump: {
    enabled: boolean;
    confidenceThreshold: number;
    severityThreshold: string;
  };
  capsSpam: {
    enabled: boolean;
    capsRatioThreshold: number;
    minMessageLength: number;
  };
  actions: {
    warningThreshold: number;
    strikeThreshold: number;
    muteThreshold: number;
    banThreshold: number;
  };
  trustScore: {
    initialScore: number;
    warningPenalty: number;
    strikePenalty: number;
    mutePenalty: number;
    banPenalty: number;
    minScore: number;
    maxScore: number;
  };
  durations: {
    warning: number;
    strike: number;
    mute: number;
    ban: number;
  };
}

export interface ModerationStats {
  totalUsers: number;
  mutedUsers: number;
  bannedUsers: number;
  totalActions: number;
  recentActions: number;
  trustScoreDistribution: Array<{
    trustScore: number;
    userCount: number;
  }>;
}

// API helper functions
const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
};

// Hooks
export function useAdminStats() {
  return useQuery<{ success: boolean; stats: AdminStats }, Error>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await apiCall('/api/admin/stats');
      return response as { success: boolean; stats: AdminStats };
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes (formerly cacheTime)
  });
}

export function useUsers(
  query: string = '',
  filters: UserSearchFilters = {},
  page: number = 1,
  limit: number = 20
) {
  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(query && { query }),
    ...(filters.tier && { tier: filters.tier }),
    ...(filters.minBalance !== undefined && { minBalance: filters.minBalance.toString() }),
    ...(filters.maxBalance !== undefined && { maxBalance: filters.maxBalance.toString() }),
    ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
    ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
  });

  return useQuery({
    queryKey: ['admin', 'users', query, filters, page, limit],
    queryFn: () => apiCall(`/api/admin/users?${searchParams}`),
    staleTime: 30000,
    gcTime: 300000,
  });
}

export function useUserDetails(userId: string) {
  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => apiCall(`/api/admin/users/${userId}`),
    enabled: !!userId,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

export function useUpdateUserTier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, newTier }: { userId: string; newTier: string }) =>
      apiCall(`/api/admin/users/${userId}/tier`, {
        method: 'PUT',
        body: JSON.stringify({ newTier }),
      }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useUpdateUserBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, newBalance }: { userId: string; newBalance: number }) =>
      apiCall(`/api/admin/users/${userId}/balance`, {
        method: 'PUT',
        body: JSON.stringify({ newBalance }),
      }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useAnalytics() {
  return useQuery<{ success: boolean; analytics: Analytics }, Error>({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const response = await apiCall('/api/admin/analytics');
      return response as { success: boolean; analytics: Analytics };
    },
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  });
}

export function useRecentActivity(limit: number = 20) {
  return useQuery<{ success: boolean; activity: RecentActivity[] }, Error>({
    queryKey: ['admin', 'activity', limit],
    queryFn: async () => {
      const response = await apiCall(`/api/admin/activity?limit=${limit}`);
      return response as { success: boolean; activity: RecentActivity[] };
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useModerationConfig() {
  return useQuery({
    queryKey: ['moderation', 'config'],
    queryFn: () => apiCall('/api/moderation/config'),
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  });
}

export function useUpdateModerationConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: ModerationConfig) =>
      apiCall('/api/moderation/config', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation', 'config'] });
    },
  });
}

export function useModerationStats() {
  return useQuery({
    queryKey: ['moderation', 'stats'],
    queryFn: () => apiCall('/api/moderation/stats'),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useTestModerationBot() {
  return useMutation({
    mutationFn: (message: string) =>
      apiCall('/api/moderation/test', {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
  });
}

// Utility hooks
// Badge Management Hooks
export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: () => apiCall('/api/badges'),
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  });
}

export function useBadgeStats() {
  return useQuery({
    queryKey: ['badges', 'stats'],
    queryFn: () => apiCall('/api/badges/stats'),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

export function useAwardBadge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ badgeId, userId }: { badgeId: string; userId: string }) =>
      apiCall('/api/badges/award', {
        method: 'POST',
        body: JSON.stringify({ badgeId, userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['badges', 'stats'] });
    },
  });
}

export function useAdminPermissions() {
  const { user } = useAuth();
  return user?.userTier === 'ADMINISTRATOR';
}

export function useAdminData() {
  const isAdmin = useAdminPermissions();
  const stats = useAdminStats();
  const activity = useRecentActivity(10);
  const analytics = useAnalytics();

  return {
    isAdmin,
    stats: stats.data?.stats,
    activity: activity.data?.activity,
    analytics: analytics.data?.analytics,
    isLoading: stats.isLoading || activity.isLoading || analytics.isLoading,
    error: stats.error || activity.error || analytics.error,
  };
}
