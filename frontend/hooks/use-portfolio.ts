/**
 * Centralized Portfolio Hook
 *
 * Single source of truth for portfolio data fetching across the app.
 * Prevents duplicate API calls and ensures consistent caching strategy.
 *
 * Usage:
 *   const { portfolio, isLoading, error, refetch } = usePortfolio()
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import * as api from '@/lib/api'
import type * as Backend from '@/lib/types/backend'

export interface UsePortfolioOptions {
  /**
   * Enable/disable the query. Defaults to user authentication status.
   */
  enabled?: boolean

  /**
   * Refetch interval in milliseconds. Defaults to 15000 (15 seconds).
   */
  refetchInterval?: number

  /**
   * Time in milliseconds before data is considered stale. Defaults to 5000 (5 seconds).
   */
  staleTime?: number
}

export function usePortfolio(options: UsePortfolioOptions = {}) {
  const { user, isAuthenticated } = useAuth()

  const {
    enabled = isAuthenticated && !!user?.id,
    refetchInterval = 15000, // 15 seconds (faster updates with optimized backend)
    staleTime = 5000, // 5 seconds (more responsive to price changes)
  } = options

  return useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      return api.getPortfolio(user.id)
    },
    enabled,
    refetchInterval,
    staleTime,
    // Keep previous data while refetching for smoother UX
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Derived hook for portfolio metrics
 *
 * Computes common portfolio statistics from portfolio data.
 *
 * Usage:
 *   const metrics = usePortfolioMetrics()
 */
export function usePortfolioMetrics() {
  const { data: portfolio } = usePortfolio()

  if (!portfolio) {
    return {
      totalValue: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      totalRealized: 0,
      totalUnrealized: 0,
      positionCount: 0,
      isEmpty: true,
    }
  }

  const totalValue = parseFloat(portfolio.totals.totalValueUsd)
  const totalPnL = parseFloat(portfolio.totals.totalPnlUsd)
  const totalRealized = parseFloat(portfolio.totals.totalRealizedUsd)
  const totalUnrealized = parseFloat(portfolio.totals.totalUnrealizedUsd)
  const positionCount = portfolio.positions?.filter(p => parseFloat(p.qty) > 0).length || 0

  // Calculate PnL percentage
  const costBasis = totalValue - totalPnL
  const totalPnLPercent = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0

  return {
    totalValue,
    totalPnL,
    totalPnLPercent,
    totalRealized,
    totalUnrealized,
    positionCount,
    isEmpty: positionCount === 0,
  }
}

/**
 * Hook to get a specific position by mint address
 *
 * Usage:
 *   const position = usePosition(tokenMint)
 */
export function usePosition(mint: string | undefined) {
  const { data: portfolio } = usePortfolio()

  if (!mint || !portfolio?.positions) {
    return null
  }

  return portfolio.positions.find(
    p => p.mint === mint && parseFloat(p.qty) > 0
  ) || null
}
