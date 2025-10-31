"use client"

import { useRouter } from "next/navigation"
import { TrendingUp, TrendingDown, X } from "lucide-react"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { usePortfolio } from "@/hooks/use-portfolio"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"

/**
 * Portfolio Positions Ticker - Minimal fixed layout showing holdings
 * 
 * Simple design: SYMBOL $PRICE +/-$PNL
 * No scrolling, no fancy animations, minimal colors
 */
export function PortfolioPositionsTicker() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { data: portfolio, isLoading } = usePortfolio()
  const { prices } = usePriceStreamContext()
  const [isVisible, setIsVisible] = useState(true)

  // Load visibility setting from localStorage
  useEffect(() => {
    const savedVisibility = localStorage.getItem('portfolio-ticker-visible')
    if (savedVisibility !== null) {
      setIsVisible(JSON.parse(savedVisibility))
    }
  }, [])

  // Save visibility setting to localStorage
  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem('portfolio-ticker-visible', JSON.stringify(false))
  }

  // Calculate real-time P&L for each position
  const positionsWithLivePnL = useMemo(() => {
    if (!portfolio?.positions || portfolio.positions.length === 0) return []

    return portfolio.positions
      .filter(position => parseFloat(position.qty) > 0)
      .map(position => {
        const qty = parseFloat(position.qty)
        const avgCost = parseFloat(position.avgCostUsd)
        
        // Get live price from WebSocket or fallback to position's current price
        const priceData = prices.get(position.mint)
        const livePrice = priceData?.price || parseFloat(position.currentPrice)
        
        // Calculate live P&L
        const currentValue = qty * livePrice
        const costBasis = qty * avgCost
        const unrealizedPnL = currentValue - costBasis

        return {
          ...position,
          livePrice,
          unrealizedPnL,
        }
      })
      .sort((a, b) => Math.abs(b.unrealizedPnL) - Math.abs(a.unrealizedPnL)) // Sort by absolute P&L (biggest movers first)
      .slice(0, 8) // Show max 8 positions to fit on screen
  }, [portfolio, prices])

  const handleTokenClick = (tokenAddress: string) => {
    router.push(`/room/${tokenAddress}`)
  }

  // Don't render if not authenticated or not visible
  if (!isAuthenticated || !user || !isVisible) {
    return null
  }

  // Don't render if no positions
  if (!isLoading && positionsWithLivePnL.length === 0) {
    return null
  }

  // Loading state
  if (isLoading && !portfolio) {
    return null // Don't show loading, just hide until ready
  }

  return (
    <div className="fixed top-[calc(var(--navbar-height)+var(--trending-ticker-height,60px))] left-0 right-0 z-sticky w-full bg-muted/40 backdrop-blur-sm border-b border-border/50">
      <div className="relative flex items-center justify-between px-4 py-1.5 gap-3 overflow-x-auto scrollbar-none">
        {/* Positions - Fixed left-to-right layout */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {positionsWithLivePnL.map((position) => {
            const isPositive = position.unrealizedPnL > 0.01
            const isNegative = position.unrealizedPnL < -0.01

            return (
              <button
                key={position.mint}
                onClick={() => handleTokenClick(position.mint)}
                className="flex items-center gap-2 flex-shrink-0 px-2 py-1 rounded-md border-2 border-[var(--sky-blue)] bg-background/80 hover:bg-background transition-all hover:scale-105"
              >
                {/* Symbol */}
                <span className="text-sm font-semibold text-foreground">
                  {position.tokenSymbol || 'UNKNOWN'}
                </span>

                {/* Holdings P&L */}
                <div className={cn(
                  "flex items-center gap-0.5 text-sm font-bold",
                  isPositive && "text-[var(--luigi-green)]",
                  isNegative && "text-[var(--mario-red)]",
                  !isPositive && !isNegative && "text-muted-foreground"
                )}>
                  {isPositive && <TrendingUp className="h-3 w-3" />}
                  {isNegative && <TrendingDown className="h-3 w-3" />}
                  <AnimatedNumber
                    value={position.unrealizedPnL}
                    prefix={position.unrealizedPnL > 0 ? '+$' : '$'}
                    decimals={2}
                    className="font-mono"
                    colorize={false}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
          aria-label="Hide portfolio ticker"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
