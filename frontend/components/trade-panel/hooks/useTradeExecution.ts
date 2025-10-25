/**
 * Trade Execution Hook
 * Handles buy/sell trade execution with optimistic updates
 */

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useRealtimePnL } from '@/hooks/use-realtime-pnl'
import { useTradingMode } from '@/lib/trading-mode-context'
import * as api from '@/lib/api'
import { formatTokenAmount, formatSolAmount } from '../utils/formatters'

export function useTradeExecution() {
  const { getUserId } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { tradeMode } = useTradingMode()
  const { addOptimisticTrade } = useRealtimePnL(tradeMode)

  const executeBuy = useCallback(async (
    tokenAddress: string,
    tokenQuantity: number,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    try {
      const userId = getUserId()
      if (!userId) throw new Error('Not authenticated')

      const result = await api.trade({
        userId,
        mint: tokenAddress,
        side: 'BUY',
        qty: tokenQuantity.toString()
      })

      if (result.success) {
        // Refresh portfolio and balance
        queryClient.invalidateQueries({ queryKey: ['portfolio'] })
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })

        toast({
          title: "🎉 Trade Success!",
          description: `Bought ${formatTokenAmount(parseFloat(result.trade.quantity))} for ${formatSolAmount(parseFloat(result.trade.totalCost))} SOL`,
          duration: 5000,
        })

        onSuccess?.()
      }

      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      toast({
        title: "Trade Failed",
        description: errorMessage,
        variant: "destructive",
      })
      onError?.(errorMessage)
      throw err
    }
  }, [getUserId, toast, queryClient])

  const executeSell = useCallback(async (
    tokenAddress: string,
    tokenQuantity: number,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    try {
      const userId = getUserId()
      if (!userId) throw new Error('Not authenticated')

      const result = await api.trade({
        userId,
        mint: tokenAddress,
        side: 'SELL',
        qty: tokenQuantity.toString()
      })

      if (result.success) {
        // Refresh portfolio and balance
        queryClient.invalidateQueries({ queryKey: ['portfolio'] })
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })

        toast({
          title: "💰 Sell Success!",
          description: `Sold ${formatTokenAmount(parseFloat(result.trade.quantity))} for ${formatSolAmount(parseFloat(result.trade.totalCost))} SOL`,
          duration: 5000,
        })

        onSuccess?.()
      }

      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      toast({
        title: "Trade Failed",
        description: errorMessage,
        variant: "destructive",
      })
      onError?.(errorMessage)
      throw err
    }
  }, [getUserId, toast, queryClient])

  return {
    executeBuy,
    executeSell,
    addOptimisticTrade
  }
}
