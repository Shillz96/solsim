import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';
import type { 
  ApiResponse,
  TrendingToken, 
  TokenDetails,
} from '../lib/types/api-types';
import type {
  TradeResponse, 
  Portfolio, 
  TokenBalance, 
  Transaction, 
  PortfolioHistoryPoint,
  WatchlistItem,
  LeaderboardEntry
} from './types/api-types';

/**
 * Hook for fetching trending tokens with React Query
 */
export function useTrendingTokens(limit = 10) {
  return useQuery({
    queryKey: ['trending', limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() });
      const response = await apiClient.get<{ success: boolean, data: { tokens: TrendingToken[] } }>(
        `/api/v1/solana-tracker/trending?${params.toString()}`
      );
      return response.data.tokens;
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
      const response = await apiClient.get<{ success: boolean, data: TokenDetails }>(
        `/api/tokens/${tokenAddress}`
      );
      return response.data;
    },
    enabled: !!tokenAddress, // Only run the query if tokenAddress is provided
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
}

/**
 * Hook for fetching user portfolio with React Query
 */
export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const response = await apiClient.get<{ 
        success: boolean, 
        data: { 
          holdings: Array<any>, 
          totalValueUsd: number,
          totalPnlUsd: number,
          pnlPercentage: number,
          solBalance?: number
        } 
      }>('/api/portfolio');
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook for executing trades with React Query
 */
export function useExecuteTrade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      action, 
      tokenAddress, 
      amountSol 
    }: { 
      action: 'buy' | 'sell', 
      tokenAddress: string, 
      amountSol: number 
    }) => {
      const response = await apiClient.post<ApiResponse<TradeResponse>>(
        '/api/trade', 
        { action, tokenAddress, amountSol }
      );
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Trade execution failed');
      }
      
      return response.data;
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
export function useBalance() {
  return useQuery({
    queryKey: ['balance'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean, data: { balanceSol: number } }>(
        '/api/users/balance'
      );
      return response.data.balanceSol;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook for fetching user transaction history with React Query
 */
export function useTransactions(limit = 10, page = 1) {
  return useQuery({
    queryKey: ['transactions', limit, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString()
      });
      
      const response = await apiClient.get<{ 
        success: boolean, 
        data: { 
          transactions: Array<any>,
          totalCount: number,
          totalPages: number
        } 
      }>(`/api/transactions?${params.toString()}`);
      
      return {
        transactions: response.data.transactions,
        totalCount: response.data.totalCount,
        totalPages: response.data.totalPages,
        currentPage: page
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook for fetching leaderboard data with React Query
 */
export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await apiClient.get<{ 
        success: boolean, 
        data: Array<{
          userId: string,
          username: string,
          avatarUrl?: string,
          totalValueUsd: number,
          pnlPercentage: number,
          rank: number
        }> 
      }>('/api/leaderboard');
      
      return response.data;
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Hook for fetching current Solana price in USD
 */
export function useSolanaPrice() {
  return useQuery({
    queryKey: ['solana-price'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ price: number }>>('/api/market/solana-price');
      return response.data?.price || 0;
    },
    staleTime: 1000 * 30, // 30 seconds for real-time pricing
  });
}

/**
 * Hook for fetching portfolio history over time
 */
export function usePortfolioHistory(timeframe: '1d' | '1w' | '1m' | '3m' | '1y' = '1w') {
  return useQuery({
    queryKey: ['portfolio-history', timeframe],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ history: PortfolioHistoryPoint[] }>>(
        `/api/portfolio/history?timeframe=${timeframe}`
      );
      return response.data?.history || [];
    },
    staleTime: timeframe === '1d' ? 1000 * 60 * 5 : 1000 * 60 * 15, // 5 minutes for daily, 15 for others
  });
}

/**
 * Hook for managing watchlist items
 */
export function useWatchlist() {
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ items: WatchlistItem[] }>>('/api/watchlist');
      return response.data?.items || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for updating watchlist items
 */
export function useUpdateWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      action, 
      tokenAddress 
    }: { 
      action: 'add' | 'remove'; 
      tokenAddress: string;
    }) => {
      if (action === 'add') {
        const response = await apiClient.post<ApiResponse>('/api/watchlist/add', { tokenAddress });
        return response.data;
      } else {
        const response = await apiClient.delete<ApiResponse>(`/api/watchlist/${tokenAddress}`);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}