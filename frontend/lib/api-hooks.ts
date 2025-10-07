// Optimized API Hooks with React Query
// Removed: Redundant deduplication (React Query handles this)
// Removed: Aggressive refetch intervals
// Strategy: Event-driven updates, on-demand refetching

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

// Services
import authService from './auth-service'
import userService from './user-service'
import portfolioService, { PortfolioSummary } from './portfolio-service'
import tradingService from './trading-service'
import leaderboardService from './leaderboard-service'
import marketService from './market-service'
import monitoringService from './monitoring-service'

// Types
import type { 
  User, 
  TradeRequest,
  TradeResult,
  TradeHistory, 
  TradeStats,
  LeaderboardEntry, 
  TrendingToken, 
  TokenDetails,
  MarketStats,
  UserSettings,
  HealthCheck,
  TimePeriod,
  TokenCategory
} from './types/api-types'

import { STALE_TIMES, CACHE_TIMES } from './query-provider'

// ============================================================================
// QUERY KEYS - Centralized for cache invalidation
// ============================================================================

export const queryKeys = {
  auth: ['auth'] as const,
  authUser: () => [...queryKeys.auth, 'user'] as const,
  
  portfolio: ['portfolio'] as const,
  portfolioSummary: () => [...queryKeys.portfolio, 'summary'] as const,
  portfolioPerformance: (period: TimePeriod) => [...queryKeys.portfolio, 'performance', period] as const,
  portfolioBalance: () => [...queryKeys.portfolio, 'balance'] as const,
  
  trading: ['trading'] as const,
  tradeHistory: (limit: number) => [...queryKeys.trading, 'history', limit] as const,
  tradeStats: () => [...queryKeys.trading, 'stats'] as const,
  recentTrades: (limit: number) => [...queryKeys.trading, 'recent', limit] as const,
  
  market: ['market'] as const,
  trendingTokens: (limit: number, category?: TokenCategory) => [...queryKeys.market, 'trending', limit, category] as const,
  tokenPrice: (address: string) => [...queryKeys.market, 'price', address] as const,
  tokenDetails: (address: string) => [...queryKeys.market, 'details', address] as const,
  marketStats: () => [...queryKeys.market, 'stats'] as const,
  
  user: ['user'] as const,
  userProfile: (userId?: string) => [...queryKeys.user, 'profile', userId || 'me'] as const,
  userSettings: () => [...queryKeys.user, 'settings'] as const,
  
  leaderboard: ['leaderboard'] as const,
  leaderboardEntries: () => [...queryKeys.leaderboard, 'entries'] as const,
  
  system: ['system'] as const,
  systemHealth: () => [...queryKeys.system, 'health'] as const,
} as const

// ============================================================================
// AUTHENTICATION HOOKS
// ============================================================================

export function useAuth() {
  const queryClient = useQueryClient()

  const { 
    data: user, 
    isLoading: loading, 
    error: queryError, 
    refetch 
  } = useQuery({
    queryKey: queryKeys.authUser(),
    queryFn: async () => {
      const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
      
      if (isDevelopment) {
        return authService.getDevUser()
      }
      
      if (authService.isAuthenticated()) {
        return await authService.getProfile()
      }
      
      return null
    },
    staleTime: STALE_TIMES.slow,
    gcTime: CACHE_TIMES.long,
    retry: false, // Don't retry auth checks
  })

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return authService.login({ email, password })
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.authUser(), response.user)
      // Invalidate user-dependent data
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio })
      queryClient.invalidateQueries({ queryKey: queryKeys.trading })
    },
  })

  const registerMutation = useMutation({
    mutationFn: async ({ email, password, username }: { email: string; password: string; username?: string }) => {
      return authService.register({ email, password, username })
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.authUser(), response.user)
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio })
      queryClient.invalidateQueries({ queryKey: queryKeys.trading })
    },
  })

  const logout = useCallback(() => {
    authService.logout()
    queryClient.clear()
    queryClient.setQueryData(queryKeys.authUser(), null)
  }, [queryClient])

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const error = queryError?.message || loginMutation.error?.message || registerMutation.error?.message || null

  return {
    user,
    loading: loading || loginMutation.isPending || registerMutation.isPending,
    error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    refresh,
    isAuthenticated: !!user
  }
}

// ============================================================================
// PORTFOLIO HOOKS - Optimized for high traffic
// ============================================================================

export function usePortfolio() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.portfolioSummary(),
    queryFn: () => portfolioService.getPortfolio(),
    enabled: !!user,
    staleTime: STALE_TIMES.moderate, // 15 minutes
    gcTime: CACHE_TIMES.medium,
    // NO automatic refetching - user triggers via pull-to-refresh or manual action
  })
}

export function usePortfolioPerformance(period: TimePeriod = '30d') {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.portfolioPerformance(period),
    queryFn: () => portfolioService.getPerformance(period),
    enabled: !!user,
    staleTime: STALE_TIMES.moderate,
    gcTime: CACHE_TIMES.medium,
  })
}

export function useBalance() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.portfolioBalance(),
    queryFn: async () => {
      const balanceData = await portfolioService.getBalance()
      return balanceData.balance
    },
    enabled: !!user,
    staleTime: STALE_TIMES.fast, // 10 minutes
    gcTime: CACHE_TIMES.short,
    // NO automatic refetching - updates after trades via invalidation
  })
}

// ============================================================================
// TRADING HOOKS - Optimized with smart invalidation
// ============================================================================

export function useTradeHistory(limit: number = 50) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.tradeHistory(limit),
    queryFn: () => tradingService.getTradeHistory({ limit }),
    enabled: !!user,
    staleTime: STALE_TIMES.moderate,
    gcTime: CACHE_TIMES.medium,
  })
}

export function useTradeStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.tradeStats(),
    queryFn: () => tradingService.getTradeStats(),
    enabled: !!user,
    staleTime: STALE_TIMES.moderate,
    gcTime: CACHE_TIMES.medium,
  })
}

export function useRecentTrades(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.recentTrades(limit),
    queryFn: () => tradingService.getRecentTrades(limit),
    staleTime: STALE_TIMES.moderate,
    gcTime: CACHE_TIMES.medium,
    // NO polling - real-time updates via WebSocket or manual refresh
  })
}

export function useTrading() {
  const queryClient = useQueryClient()

  const tradeMutation = useMutation({
    mutationFn: (tradeRequest: TradeRequest) => tradingService.executeTrade(tradeRequest),
    onSuccess: () => {
      // Invalidate affected queries after successful trade
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioBalance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioSummary() })
      queryClient.invalidateQueries({ queryKey: queryKeys.trading })
      queryClient.invalidateQueries({ queryKey: queryKeys.authUser() })
    }
  })

  const executeBuy = useCallback(async (tokenAddress: string, amountSol: number) => {
    return tradeMutation.mutateAsync({
      action: 'buy',
      tokenAddress,
      amountSol
    })
  }, [tradeMutation])

  const executeSell = useCallback(async (tokenAddress: string, amountSol: number) => {
    return tradeMutation.mutateAsync({
      action: 'sell',
      tokenAddress,
      amountSol
    })
  }, [tradeMutation])

  return {
    isTrading: tradeMutation.isPending,
    tradeError: tradeMutation.error?.message || null,
    executeTrade: tradeMutation.mutateAsync,
    executeBuy,
    executeSell,
    clearError: () => tradeMutation.reset()
  }
}

// ============================================================================
// MARKET DATA HOOKS - Cached aggressively
// ============================================================================

export function useTrendingTokens(limit: number = 20, category?: TokenCategory) {
  return useQuery({
    queryKey: queryKeys.trendingTokens(limit, category),
    queryFn: () => marketService.getTrendingTokens(limit, category),
    staleTime: STALE_TIMES.moderate, // 15 minutes
    gcTime: CACHE_TIMES.medium,
    // NO polling - manual refresh only
  })
}

export function useTokenPrice(tokenAddress: string) {
  return useQuery({
    queryKey: queryKeys.tokenPrice(tokenAddress),
    queryFn: () => marketService.getTokenPrice(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: STALE_TIMES.fast, // 10 minutes
    gcTime: CACHE_TIMES.short,
    // NO polling - WebSocket or manual refresh
  })
}

export function useTokenDetails(tokenAddress: string) {
  return useQuery({
    queryKey: queryKeys.tokenDetails(tokenAddress),
    queryFn: () => marketService.getTokenDetails(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: STALE_TIMES.slow, // 30 minutes
    gcTime: CACHE_TIMES.long,
  })
}

export function useMarketStats() {
  return useQuery({
    queryKey: queryKeys.marketStats(),
    queryFn: () => marketService.getMarketStats(),
    staleTime: STALE_TIMES.static, // 60 minutes
    gcTime: CACHE_TIMES.long,
  })
}

// ============================================================================
// USER HOOKS
// ============================================================================

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: queryKeys.userProfile(userId),
    queryFn: () => userService.getProfile(userId),
    staleTime: STALE_TIMES.slow,
    gcTime: CACHE_TIMES.medium,
  })
}

export function useUserSettings() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.userSettings(),
    queryFn: () => userService.getSettings(),
    enabled: !!user,
    staleTime: STALE_TIMES.slow,
    gcTime: CACHE_TIMES.medium,
  })
}

// ============================================================================
// LEADERBOARD HOOKS
// ============================================================================

export function useLeaderboard() {
  return useQuery({
    queryKey: queryKeys.leaderboardEntries(),
    queryFn: () => leaderboardService.getLeaderboard(),
    staleTime: STALE_TIMES.static, // 60 minutes
    gcTime: CACHE_TIMES.long,
  })
}

// ============================================================================
// SYSTEM MONITORING HOOKS
// ============================================================================

export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.systemHealth(),
    queryFn: () => monitoringService.getHealth(),
    staleTime: STALE_TIMES.static, // 60 minutes
    gcTime: CACHE_TIMES.long,
    // NO polling for health checks
    retry: 1,
  })
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  return useMemo(() => ({
    invalidateAuth: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth }),
    invalidatePortfolio: () => queryClient.invalidateQueries({ queryKey: queryKeys.portfolio }),
    invalidateTrading: () => queryClient.invalidateQueries({ queryKey: queryKeys.trading }),
    invalidateMarket: () => queryClient.invalidateQueries({ queryKey: queryKeys.market }),
    invalidateUser: () => queryClient.invalidateQueries({ queryKey: queryKeys.user }),
    invalidateAll: () => queryClient.invalidateQueries(),
    clearCache: () => queryClient.clear(),
  }), [queryClient])
}

export function usePrefetch() {
  const queryClient = useQueryClient()

  return useMemo(() => ({
    prefetchTrendingTokens: (limit = 20, category?: TokenCategory) => {
      return queryClient.prefetchQuery({
        queryKey: queryKeys.trendingTokens(limit, category),
        queryFn: () => marketService.getTrendingTokens(limit, category),
        staleTime: STALE_TIMES.moderate,
      })
    },
    prefetchTokenDetails: (tokenAddress: string) => {
      return queryClient.prefetchQuery({
        queryKey: queryKeys.tokenDetails(tokenAddress),
        queryFn: () => marketService.getTokenDetails(tokenAddress),
        staleTime: STALE_TIMES.slow,
      })
    },
    prefetchLeaderboard: () => {
      return queryClient.prefetchQuery({
        queryKey: queryKeys.leaderboardEntries(),
        queryFn: () => leaderboardService.getLeaderboard(),
        staleTime: STALE_TIMES.static,
      })
    }
  }), [queryClient])
}

