"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { formatNumber, formatUSD, formatPriceUSD, formatTokenQuantity } from "@/lib/format"
import { useAuth } from "@/hooks/use-auth"
import { usePriceStreamContext } from "@/lib/price-stream-provider"

interface RealtimeTradeStripProps {
  className?: string
  style?: React.CSSProperties
  maxTrades?: number
}

export function RealtimeTradeStrip({
  className,
  style,
  maxTrades
}: RealtimeTradeStripProps) {
  const { user } = useAuth()
  const { prices: livePrices } = usePriceStreamContext()
  const [positions, setPositions] = useState<Backend.PortfolioPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load user's portfolio positions
  const loadPositions = useCallback(async () => {
    if (!user?.id) {
      setPositions([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // Add timestamp to bust any caching
      const response = await api.getPortfolio(user.id)
      // Filter to only show positions with quantity > 0
      const heldPositions = response.positions.filter(pos => parseFloat(pos.qty) > 0)
      setPositions(heldPositions)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Clear positions immediately when user changes
  useEffect(() => {
    // Clear old data immediately to prevent showing wrong user's data
    setPositions([])
    setError(null)
    setLoading(true)
  }, [user?.id])

  // Load positions on mount and when user changes
  useEffect(() => {
    loadPositions()
  }, [loadPositions])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      loadPositions()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadPositions, user?.id])

  // Calculate real-time PnL using live prices
  const getRealtimePnL = (position: Backend.PortfolioPosition) => {
    const livePrice = livePrices.get(position.mint)?.price
    if (livePrice) {
      const qty = parseFloat(position.qty)
      const avgCost = parseFloat(position.avgCostUsd)
      const currentValue = qty * livePrice
      const totalCost = qty * avgCost
      const unrealizedPnL = currentValue - totalCost
      const unrealizedPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0

      return {
        unrealizedUsd: unrealizedPnL,
        unrealizedPercent,
        currentPrice: livePrice
      }
    }

    // Fallback to stored values
    return {
      unrealizedUsd: parseFloat(position.unrealizedUsd),
      unrealizedPercent: parseFloat(position.unrealizedPercent),
      currentPrice: parseFloat(position.currentPrice)
    }
  }

  if (!user) {
    return null // Don't show anything if user is not logged in
  }

  if (loading) {
    return (
      <div className={cn("w-full bg-background backdrop-blur-md border-t border-b py-1.5", className)} style={style}>
        <div className="flex items-center space-x-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-12 h-3 bg-muted rounded" />
              <div className="w-16 h-3 bg-muted rounded" />
              <div className="w-12 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("w-full bg-background backdrop-blur-md border-t border-b py-2", className)} style={style}>
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <span>Unable to load positions</span>
          <button
            onClick={() => loadPositions()}
            className="ml-2 underline hover:text-foreground transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "w-full bg-background backdrop-blur-md border-t border-b overflow-hidden",
        className
      )}
      style={style}
    >
      <div className="flex items-center py-2 px-2 space-x-6 overflow-x-auto scrollbar-none">
        {positions.length === 0 ? (
          <div className="flex items-center justify-center w-full py-1 text-sm text-muted-foreground">
            No open positions
          </div>
        ) : (
          positions.slice(0, maxTrades).map((position) => {
            const pnl = getRealtimePnL(position)
            const isProfit = pnl.unrealizedUsd >= 0

            return (
              <div
                key={position.mint}
                className="flex items-center space-x-3 whitespace-nowrap flex-shrink-0"
              >
                {position.tokenImage && (
                  <img
                    src={position.tokenImage}
                    alt={position.tokenSymbol || 'Token'}
                    className="w-4 h-4 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}

                <span className="font-medium text-sm">
                  {position.tokenSymbol || 'Unknown'}
                </span>

                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded flex items-center gap-1",
                  isProfit
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                )}>
                  <span>{isProfit ? '+' : ''}{formatUSD(pnl.unrealizedUsd)}</span>
                  <span className="text-[10px]">
                    ({isProfit ? '+' : ''}{pnl.unrealizedPercent.toFixed(2)}%)
                  </span>
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
