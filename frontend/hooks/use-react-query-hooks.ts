import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type * as Backend from '../lib/types/backend';

/**
 * Hook for fetching trending tokens with React Query
 */
export function useTrendingTokens(limit = 10, sortBy: 'rank' | 'volume24hUSD' | 'liquidity' = 'rank') {
  return useQuery({
    queryKey: ['trending', limit, sortBy],
    queryFn: async () => {
      const trending = await api.getTrending(sortBy);
      return trending.slice(0, limit);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// NOTE: usePortfolio hook has been moved to ./use-portfolio.ts
// Import from there instead: import { usePortfolio } from './use-portfolio'
// This prevents duplicate hooks and ensures consistent behavior

// Helper function to get user ID (used by legacy hooks)
function getUserId(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('userId');
    if (stored) return stored;
  }
  throw new Error('User not authenticated');
}

/**
 * Hook for executing trades with React Query (with optimistic updates)
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
    onSuccess: async (tradeResult, variables) => {
      // Optimistically update portfolio data immediately for perceived speed
      queryClient.setQueryData(['portfolio', variables.userId], (old: any) => {
        if (!old) return old;

        // The actual values will be corrected when the refetch completes
        // This is just for instant visual feedback
        return {
          ...old,
          // Mark data as pending update
          _optimistic: true,
        };
      });

      // Then invalidate and refetch for accurate data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['balance'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      ]);

      // Force immediate refetch for portfolio to show accurate PnL
      await queryClient.refetchQueries({ queryKey: ['portfolio'] });
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

/**
 * Hook for fetching tokenized stocks with React Query
 */
export function useStocks(limit = 50) {
  return useQuery({
    queryKey: ['stocks', limit],
    queryFn: async () => {
      return await api.getStocks(limit);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Additional hooks can be added here as backend endpoints are implemented