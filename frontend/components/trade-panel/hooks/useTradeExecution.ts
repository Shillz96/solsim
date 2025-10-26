/**
 * Trade Execution Hook
 * Handles buy/sell trade execution with optimistic updates
 */

import { useCallback, useState } from 'react'
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
  const { tradeMode, refreshBalances } = useTradingMode()
  const { addOptimisticTrade } = useRealtimePnL(tradeMode)
  
  // Track execution state
  const [isExecuting, setIsExecuting] = useState(false)

  const executeBuy = useCallback(async (
    tokenAddress: string,
    tokenQuantity: number,
    solAmount: number,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    setIsExecuting(true)
    try {
      const userId = getUserId()
      if (!userId) throw new Error('Not authenticated')

      // Optimistic balance update
      queryClient.setQueryData(['user-balance', userId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          balance: (parseFloat(old.balance) - solAmount).toString()
        }
      })

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

        await refreshBalances()
        onSuccess?.()
      } else {
        // Revert optimistic update on failure
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })
      }

      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      
      // Revert optimistic update on error
      const userId = getUserId()
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })
      }
      
      toast({
        title: "❌ Trade Failed",
        description: errorMessage,
        variant: "destructive",
      })
      onError?.(errorMessage)
      throw err
    } finally {
      setIsExecuting(false)
    }
  }, [getUserId, toast, queryClient, refreshBalances])

  const executeSell = useCallback(async (
    tokenAddress: string,
    tokenQuantity: number,
    solAmount: number,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    setIsExecuting(true)
    try {
      const userId = getUserId()
      if (!userId) throw new Error('Not authenticated')

      // Optimistic balance update
      queryClient.setQueryData(['user-balance', userId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          balance: (parseFloat(old.balance) + solAmount).toString()
        }
      })

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

        await refreshBalances()
        onSuccess?.()
      } else {
        // Revert optimistic update on failure
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })
      }

      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      
      // Revert optimistic update on error
      const userId = getUserId()
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })
      }
      
      toast({
        title: "❌ Trade Failed",
        description: errorMessage,
        variant: "destructive",
      })
      onError?.(errorMessage)
      throw err
    } finally {
      setIsExecuting(false)
    }
  }, [getUserId, toast, queryClient, refreshBalances])

  return {
    executeBuy,
    executeSell,
    addOptimisticTrade,
    isExecuting
  }
}

