// Enhanced API Hooks with TanStack Query
// Provides sophisticated caching, background refetching, optimistic updates, and error handling

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions 
} from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

// Services
import authService from './auth-service'
import userService from './user-service'
import portfolioService, { PortfolioSummary, PerformanceData as PortfolioPerformanceData } from './portfolio-service'
import tradingService from './trading-service'
import leaderboardService from './leaderboard-service'
import marketService from './market-service'
import monitoringService from './monitoring-service'

// Types
import type { 
  User, 
  UserProfile, 
  Portfolio, 
  TradeRequest,
  TradeResult,
  TradeHistory, 
  TradeStats,
  LeaderboardEntry, 
  TrendingToken, 
  TokenPrice,
  TokenDetails,
  MarketStats,
  UserSettings,
  HealthCheck,
  SystemMetrics,
  TimePeriod,
  TokenCategory
} from './types/api-types'

import { STALE_TIMES, CACHE_TIMES } from './query-provider'
import { ApiError } from './api-client'

// ============================================================================
// QUERY KEYS - Centralized key management for cache invalidation
// ============================================================================

export const queryKeys = {
  // Authentication
  auth: ['auth'] as const,
  authUser: () => [...queryKeys.auth, 'user'] as const,
  
  // Portfolio
  portfolio: ['portfolio'] as const,
  portfolioSummary: () => [...queryKeys.portfolio, 'summary'] as const,
  portfolioPerformance: (period: TimePeriod) => [...queryKeys.portfolio, 'performance', period] as const,
  portfolioBalance: () => [...queryKeys.portfolio, 'balance'] as const,
  
  // Trading
  trading: ['trading'] as const,
  tradeHistory: (limit: number) => [...queryKeys.trading, 'history', limit] as const,
  tradeStats: () => [...queryKeys.trading, 'stats'] as const,
  recentTrades: (limit: number) => [...queryKeys.trading, 'recent', limit] as const,
  
  // Market Data
  market: ['market'] as const,
  trendingTokens: (limit: number, category?: TokenCategory) => [...queryKeys.market, 'trending', limit, category] as const,
  tokenPrice: (address: string) => [...queryKeys.market, 'price', address] as const,
  tokenDetails: (address: string) => [...queryKeys.market, 'details', address] as const,
  marketStats: () => [...queryKeys.market, 'stats'] as const,
  
  // User
  user: ['user'] as const,
  userProfile: (userId?: string) => [...queryKeys.user, 'profile', userId || 'me'] as const,
  userSettings: () => [...queryKeys.user, 'settings'] as const,
  
  // Leaderboard
  leaderboard: ['leaderboard'] as const,
  leaderboardEntries: () => [...queryKeys.leaderboard, 'entries'] as const,
  
  // System
  system: ['system'] as const,
  systemHealth: () => [...queryKeys.system, 'health'] as const,
} as const

// ============================================================================
// AUTHENTICATION HOOKS
// ============================================================================

export function useAuth() {
  const queryClient = useQueryClient()

  // Query for current user authentication state
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
        // In development mode, return mock user
        return authService.getDevUser()
      }
      
      // Production mode authentication check
      if (authService.isAuthenticated()) {
        return await authService.getProfile()
      }
      
      return null
    },
    staleTime: STALE_TIMES.moderate,
    gcTime: CACHE_TIMES.medium,
    retry: 1, // Don't retry auth failures aggressively
    networkMode: 'online',
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return authService.login({ email, password })
    },
    onSuccess: (response) => {
      // Update auth cache with new user data
      queryClient.setQueryData(queryKeys.authUser(), response.user)
      // Invalidate all user-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio })
      queryClient.invalidateQueries({ queryKey: queryKeys.user })
      queryClient.invalidateQueries({ queryKey: queryKeys.trading })
    },
    onError: (error) => {
      console.error('Login failed:', error)
    }
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ email, password, username }: { email: string; password: string; username?: string }) => {
      return authService.register({ email, password, username })
    },
    onSuccess: (response) => {
      // Update auth cache with new user data
      queryClient.setQueryData(queryKeys.authUser(), response.user)
      // Invalidate all user-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio })
      queryClient.invalidateQueries({ queryKey: queryKeys.user })
      queryClient.invalidateQueries({ queryKey: queryKeys.trading })
    },
    onError: (error) => {
      console.error('Registration failed:', error)
    }
  })

  // Logout function
  const logout = useCallback(() => {
    authService.logout()
    // Clear all cached data
    queryClient.clear()
    // Set auth state to null
    queryClient.setQueryData(queryKeys.authUser(), null)
  }, [queryClient])

  // Refresh function
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
// PORTFOLIO HOOKS
// ============================================================================

export function usePortfolio() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.portfolioSummary(),
    queryFn: () => portfolioService.getPortfolio(),
    enabled: !!user, // Only run when user is authenticated
    staleTime: STALE_TIMES.moderate,
    gcTime: CACHE_TIMES.medium,
    refetchInterval: 30000, // Background refetch every 30 seconds
    refetchIntervalInBackground: true,
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
    staleTime: STALE_TIMES.fast, // Balance changes frequently
    gcTime: CACHE_TIMES.short,
    refetchInterval: 15000, // Refetch every 15 seconds
    refetchIntervalInBackground: true,
  })
}

// ============================================================================
// TRADING HOOKS
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

export function useRecentTrades(limit: number = 20) {
  return useQuery({
    queryKey: queryKeys.recentTrades(limit),
    queryFn: () => tradingService.getRecentTrades(limit),
    staleTime: STALE_TIMES.fast,
    gcTime: CACHE_TIMES.short,
    refetchInterval: 30000, // Recent trades update frequently
  })
}

// Enhanced trading hook with optimistic updates
export function useTrading() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const tradeMutation = useMutation({
    mutationFn: (tradeRequest: TradeRequest) => tradingService.executeTrade(tradeRequest),
    onMutate: async (tradeRequest) => {
      // Cancel outgoing refetches for optimistic updates
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolioBalance() })
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolioSummary() })

      // Snapshot previous values
      const previousBalance = queryClient.getQueryData(queryKeys.portfolioBalance())
      const previousPortfolio = queryClient.getQueryData(queryKeys.portfolioSummary())

      // Optimistically update balance (rough estimation)
      if (previousBalance && typeof previousBalance === 'string') {
        const currentBalance = parseFloat(previousBalance)
        if (tradeRequest.action === 'buy') {
          // Estimate balance decrease for buy orders
          const estimatedNewBalance = Math.max(0, currentBalance - tradeRequest.amountSol)
          queryClient.setQueryData(queryKeys.portfolioBalance(), estimatedNewBalance.toFixed(8))
        }
      }

      return { previousBalance, previousPortfolio }
    },
    onError: (err, tradeRequest, context) => {
      // Rollback optimistic updates on error
      if (context?.previousBalance) {
        queryClient.setQueryData(queryKeys.portfolioBalance(), context.previousBalance)
      }
      if (context?.previousPortfolio) {
        queryClient.setQueryData(queryKeys.portfolioSummary(), context.previousPortfolio)
      }
    },
    onSuccess: () => {
      // Invalidate related data to fetch fresh values
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioBalance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioSummary() })
      queryClient.invalidateQueries({ queryKey: queryKeys.trading }) // Invalidate all trading queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tradeStats() })
      queryClient.invalidateQueries({ queryKey: queryKeys.authUser() }) // Refresh user balance
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
// MARKET DATA HOOKS
// ============================================================================

export function useTrendingTokens(limit: number = 20, category?: TokenCategory) {
  return useQuery({
    queryKey: queryKeys.trendingTokens(limit, category),
    queryFn: () => marketService.getTrendingTokens(limit, category),
    staleTime: STALE_TIMES.moderate,
    gcTime: CACHE_TIMES.medium,
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: true,
  })
}

export function useTokenPrice(tokenAddress: string) {
  return useQuery({
    queryKey: queryKeys.tokenPrice(tokenAddress),
    queryFn: () => marketService.getTokenPrice(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: STALE_TIMES.fast, // Prices change frequently
    gcTime: CACHE_TIMES.short,
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchIntervalInBackground: true,
  })
}

export function useTokenDetails(tokenAddress: string) {
  return useQuery({
    queryKey: queryKeys.tokenDetails(tokenAddress),
    queryFn: () => marketService.getTokenDetails(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: STALE_TIMES.slow, // Token details change less frequently
    gcTime: CACHE_TIMES.long,
  })
}

export function useMarketStats() {
  return useQuery({
    queryKey: queryKeys.marketStats(),
    queryFn: () => marketService.getMarketStats(),
    staleTime: STALE_TIMES.static,
    gcTime: CACHE_TIMES.long,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
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
    staleTime: STALE_TIMES.static,
    gcTime: CACHE_TIMES.long,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  })
}

// ============================================================================
// SYSTEM MONITORING HOOKS
// ============================================================================

export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.systemHealth(),
    queryFn: () => monitoringService.getHealth(),
    staleTime: STALE_TIMES.fast,
    gcTime: CACHE_TIMES.short,
    refetchInterval: 30000, // Monitor health every 30 seconds
    refetchIntervalInBackground: true,
    retry: 1, // Don't retry health checks aggressively
  })
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

// Hook to manually trigger cache invalidation
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

// Hook for prefetching data
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