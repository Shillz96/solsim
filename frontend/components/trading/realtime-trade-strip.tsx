"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import * as Backend from "@/lib/types/backend"
import { formatNumber, formatUSD, formatPriceUSD, formatTokenQuantity } from "@/lib/format"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio } from "@/hooks/use-portfolio"
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
  const router = useRouter()

  // Use centralized portfolio hook
  const {
    data: portfolio,
    isLoading: loading,
    error: portfolioError,
    refetch
  } = usePortfolio()

  const error = portfolioError ? portfolioError.message : null
  const positions = portfolio?.positions?.filter(pos => parseFloat(pos.qty) > 0) || []

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
            onClick={() => refetch()}
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
      <div className="flex items-center py-1 px-2 space-x-6 overflow-x-auto scrollbar-none">
        {positions.length === 0 ? (
          <div className="flex items-center justify-center w-full py-1 text-sm text-muted-foreground">
            No open positions
          </div>
        ) : (
          positions.slice(0, maxTrades).map((position) => {
            const pnl = getRealtimePnL(position)
            const isProfit = pnl.unrealizedUsd >= 0

            return (
              <button
                key={position.mint}
                onClick={() => router.push(`/trade?token=${position.mint}`)}
                className="flex items-center space-x-3 whitespace-nowrap flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
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
                  "text-xs font-medium px-2 py-0.5 rounded",
                  isProfit
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                )}>
                  {isProfit ? '+' : ''}{formatUSD(pnl.unrealizedUsd)}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
