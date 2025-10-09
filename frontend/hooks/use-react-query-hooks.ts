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
      const trending = await api.getTrendingTokens();
      return trending.slice(0, limit);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for fetching token details with React Query
 */
export function useTokenDetails(tokenAddress: string | null) {
  return useQuery({
    queryKey: ['token', tokenAddress],
    queryFn: async () => {
      if (!tokenAddress) throw new Error('Token address is required');
      return await api.getTokenDetails(tokenAddress);
    },
    enabled: !!tokenAddress,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

/**
 * Hook for fetching user portfolio with React Query
 * @deprecated Use usePortfolio from @/hooks/use-portfolio instead
 */
export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      return api.getPortfolio(getUserId());
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/wallet/balance/${userIdToUse}`);
      if (!response.ok) throw new Error('Failed to fetch balance');
      const data = await response.json();
      return data.balance;
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/wallet/transactions/${userIdToUse}?limit=${limit}&offset=${offset}`
      );
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      return data.transactions;
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