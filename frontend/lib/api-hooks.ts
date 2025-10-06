// React Hooks for API Data Management
// Provides easy-to-use hooks with loading states, error handling, and caching

import { useState, useEffect, useCallback } from 'react'
import authService from './auth-service'
import userService from './user-service'
import portfolioService, { PortfolioSummary, PerformanceData as PortfolioPerformanceData } from './portfolio-service'
import tradingService from './trading-service'
import leaderboardService from './leaderboard-service'
import marketService from './market-service'
import monitoringService from './monitoring-service'
import { ApiError } from './api-client'
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

// Hook state interface
interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// Authentication hooks
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
      
      if (isDevelopment) {
        // In development mode, immediately set mock user (only log once)
        if (!user) {
          console.log('🔓 Development mode: Setting mock user')
          setUser(authService.getDevUser())
        }
        setLoading(false)
        return
      }
      
      // Production mode authentication check
      if (authService.isAuthenticated()) {
        try {
          const userProfile = await authService.getProfile()
          setUser(userProfile)
        } catch (err) {
          console.error('Auth check failed:', err)
          authService.logout()
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authService.login({ email, password })
      setUser(response.user)
      return response
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, username?: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authService.register({ email, password, username })
      setUser(response.user)
      return response
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const refresh = async () => {
    if (authService.isAuthenticated()) {
      try {
        const userProfile = await authService.getProfile()
        setUser(userProfile)
      } catch (err) {
        console.error('Auth refresh failed:', err)
        authService.logout()
        setUser(null)
      }
    }
  }

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refresh,
    isAuthenticated: !!user
  }
}

// Portfolio hooks
export function usePortfolio(): UseApiState<PortfolioSummary> {
  const [data, setData] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const portfolio = await portfolioService.getPortfolio()
      setData(portfolio)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

export function usePortfolioPerformance(period: TimePeriod = '30d'): UseApiState<PortfolioPerformanceData> {
  const [data, setData] = useState<PortfolioPerformanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const performance = await portfolioService.getPerformance(period)
      setData(performance)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [period, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// Trading hooks
export function useTradeHistory(limit: number = 50): UseApiState<TradeHistory> {
  const [data, setData] = useState<TradeHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const history = await tradingService.getTradeHistory({ limit })
      setData(history)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// Enhanced trading hook for real-time trading functionality
export function useTrading() {
  const [isTrading, setIsTrading] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const { user, refresh: refreshAuth } = useAuth()

  const executeTrade = useCallback(async (tradeRequest: TradeRequest): Promise<TradeResult> => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    setIsTrading(true)
    setTradeError(null)

    try {
      const result = await tradingService.executeTrade(tradeRequest)
      
      // Refresh user auth to update balance
      await refreshAuth()
      
      return result
    } catch (err) {
      const error = err as ApiError
      setTradeError(error.message)
      throw error
    } finally {
      setIsTrading(false)
    }
  }, [user, refreshAuth])

  const executeBuy = useCallback(async (tokenAddress: string, amountSol: number): Promise<TradeResult> => {
    return executeTrade({
      action: 'buy',
      tokenAddress,
      amountSol
    })
  }, [executeTrade])

  const executeSell = useCallback(async (tokenAddress: string, amountSol: number): Promise<TradeResult> => {
    return executeTrade({
      action: 'sell',
      tokenAddress,
      amountSol
    })
  }, [executeTrade])

  return {
    isTrading,
    tradeError,
    executeTrade,
    executeBuy,
    executeSell,
    clearError: () => setTradeError(null)
  }
}

// Leaderboard hooks
export function useLeaderboard(): UseApiState<LeaderboardEntry[]> {
  const [data, setData] = useState<LeaderboardEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const leaderboard = await leaderboardService.getLeaderboard()
      setData(leaderboard)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// Market data hooks
export function useTrendingTokens(
  limit: number = 20, 
  category?: TokenCategory
): UseApiState<TrendingToken[]> {
  const [data, setData] = useState<TrendingToken[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const trending = await marketService.getTrendingTokens(limit, category)
      setData(trending)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [limit, category])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// Token price hook
export function useTokenPrice(tokenAddress: string): UseApiState<TokenPrice> {
  const [data, setData] = useState<TokenPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!tokenAddress) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const price = await marketService.getTokenPrice(tokenAddress)
      setData(price)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [tokenAddress])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// Token details hook
export function useTokenDetails(tokenAddress: string): UseApiState<TokenDetails> {
  const [data, setData] = useState<TokenDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!tokenAddress) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const details = await marketService.getTokenDetails(tokenAddress)
      setData(details)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [tokenAddress])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// Market stats hook
export function useMarketStats(): UseApiState<MarketStats> {
  const [data, setData] = useState<MarketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const stats = await marketService.getMarketStats()
      setData(stats)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// User profile hooks
export function useUserProfile(userId?: string): UseApiState<UserProfile> {
  const [data, setData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const profile = await userService.getProfile(userId)
      setData(profile)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// User settings hook
export function useUserSettings(): UseApiState<UserSettings> {
  const [data, setData] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const settings = await userService.getSettings()
      setData(settings)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// Trade stats hook
export function useTradeStats(): UseApiState<TradeStats> {
  const [data, setData] = useState<TradeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const stats = await tradingService.getTradeStats()
      setData(stats)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// Recent trades hook
export function useRecentTrades(limit: number = 20): UseApiState<any[]> {
  const [data, setData] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const trades = await tradingService.getRecentTrades(limit)
      setData(trades)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

// System health hook
export function useSystemHealth(): UseApiState<HealthCheck> {
  const [data, setData] = useState<HealthCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const health = await monitoringService.getHealth()
      setData(health)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  return { data, loading, error, refresh }
}

// Balance hook with caching
export function useBalance() {
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)
  const { user } = useAuth()

  // Cache balance for 5 seconds to prevent excessive API calls
  const CACHE_DURATION = 5000 

  const refresh = useCallback(async (force = false) => {
    if (!user) {
      setBalance(null)
      setLoading(false)
      setError(null)
      return
    }

    // Check cache unless forced refresh
    const now = Date.now()
    if (!force && now - lastFetch < CACHE_DURATION && balance !== null) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      const balanceData = await portfolioService.getBalance()
      setBalance(balanceData.balance)
      setLastFetch(now)
    } catch (err) {
      const error = err as ApiError
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [user, balance, lastFetch])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { balance, loading, error, refresh: () => refresh(true) }
}