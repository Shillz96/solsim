import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type * as Backend from '../lib/types/backend';

/**
 * Hook for fetching trending tokens with React Query
 */
export function useTrendingTokens(limit = 10) {
  return useQuery({
    queryKey: ['trending', limit],
    queryFn: async () => {
      const trending = await api.getTrending();
      return trending.slice(0, limit);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching user portfolio with React Query
 */
export function usePortfolio(userId?: string) {
  return useQuery({
    queryKey: ['portfolio', userId],
    queryFn: async () => {
      const userIdToUse = userId || getUserId();
      return api.getPortfolio(userIdToUse);
    },
    enabled: !!userId || (typeof window !== 'undefined' && !!localStorage.getItem('userId')),
    staleTime: 1000 * 5, // 5 seconds (faster with optimized backend)
    refetchInterval: 1000 * 15, // 15 seconds (more responsive updates)
  });
}

// Helper function to get user ID (you may need to adjust this based on your auth system)
function getUserId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('userId');
    if (stored) return stored;
  }
  throw new Error('User not authenticated');
}

/**
 * Hook for executing trades with React Query
 */
export function useExecuteTrade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId,
      action, 
      tokenAddress, 
      qty 
    }: { 
      userId: string,
      action: 'buy' | 'sell', 
      tokenAddress: string, 
      qty: string 
    }) => {
      return await api.trade({
        userId,
        mint: tokenAddress,
        side: action.toUpperCase() as 'BUY' | 'SELL',
        qty
      });
    },
    onSuccess: () => {
      // Invalidate related queries to refresh their data
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

/**
 * Hook for fetching user balance with React Query
 */
export function useBalance(userId?: string) {
  return useQuery({
    queryKey: ['balance', userId],
    queryFn: async () => {
      const userIdToUse = userId || getUserId();
      // Use the centralized API instead of direct fetch
      return api.getWalletBalance(userIdToUse);
    },
    enabled: !!userId || (typeof window !== 'undefined' && !!localStorage.getItem('userId')),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook for fetching user transaction history with React Query
 */
export function useTransactions(userId?: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['transactions', userId, limit, offset],
    queryFn: async () => {
      const userIdToUse = userId || getUserId();
      // Use the centralized API instead of direct fetch
      return api.getWalletTransactions(userIdToUse, limit, offset);
    },
    enabled: !!userId || (typeof window !== 'undefined' && !!localStorage.getItem('userId')),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook for fetching leaderboard data with React Query
 */
export function useLeaderboard(limit = 50) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: async () => {
      return await api.getLeaderboard(limit);
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// Additional hooks can be added here as backend endpoints are implemented