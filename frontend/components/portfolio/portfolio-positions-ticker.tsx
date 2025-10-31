"use client"

import { useRouter } from "next/navigation"
import { TrendingUp, TrendingDown, Loader2, Wallet, ExternalLink, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { TokenLogo } from "@/components/ui/token-logo"
import { usePortfolio } from "@/hooks/use-portfolio"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import "@/styles/ticker.css"

/**
 * Portfolio Positions Ticker - Mario-themed scrolling ticker for user's holdings
 *
 * Features:
 * - Shows user's current positions with real-time P&L
 * - Horizontal auto-scrolling ticker
 * - Click token to trade in room
 * - Mario coin/badge styling
 * - Pause on hover
 * - Collapsible with persistent state
 * - Behind rewards timer in z-index
 */
export function PortfolioPositionsTicker() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { data: portfolio, isLoading, error, refetch } = usePortfolio()
  const { prices } = usePriceStreamContext()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // Load visibility setting from localStorage
  useEffect(() => {
    const savedVisibility = localStorage.getItem('portfolio-ticker-visible')
    if (savedVisibility !== null) {
      setIsVisible(JSON.parse(savedVisibility))
    }
  }, [])

  // Save visibility setting to localStorage
  const handleToggleVisibility = () => {
    const newVisibility = !isVisible
    setIsVisible(newVisibility)
    localStorage.setItem('portfolio-ticker-visible', JSON.stringify(newVisibility))
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
        const unrealizedPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0

        return {
          ...position,
          livePrice,
          currentValue,
          unrealizedPnL,
          unrealizedPercent,
        }
      })
      .sort((a, b) => b.currentValue - a.currentValue) // Sort by value (largest first)
  }, [portfolio, prices])

  const handleTokenClick = (tokenAddress: string) => {
    router.push(`/room/${tokenAddress}`)
  }

  const handleViewPortfolio = () => {
    router.push('/portfolio')
  }

  // Don't render if not authenticated or not visible
  if (!isAuthenticated || !user) {
    return null
  }

  if (!isVisible) {
    return null
  }

  // Don't render if no positions
  if (!isLoading && positionsWithLivePnL.length === 0) {
    return null
  }

  // Loading state
  if (isLoading && !portfolio) {
    return (
      <div className="fixed top-[calc(var(--navbar-height)+var(--trending-ticker-height,60px))] left-0 right-0 z-sticky overflow-hidden bg-gradient-to-r from-[var(--pipe-green)] to-[var(--pipe-green)]/80 border-b-4 border-outline shadow-md">
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
          <span className="text-sm font-body text-white">Loading Positions...</span>
        </div>
      </div>
    )
  }

  // Duplicate positions for seamless infinite scroll (if more than 2 positions)
  const duplicatedPositions = positionsWithLivePnL.length > 2 
    ? [...positionsWithLivePnL, ...positionsWithLivePnL, ...positionsWithLivePnL]
    : [...positionsWithLivePnL, ...positionsWithLivePnL, ...positionsWithLivePnL, ...positionsWithLivePnL, ...positionsWithLivePnL]

  return (
    <div className="fixed top-[calc(var(--navbar-height)+var(--trending-ticker-height,60px))] left-0 right-0 z-sticky w-full overflow-hidden bg-gradient-to-r from-[var(--pipe-green)] to-[var(--pipe-green)]/80 border-b-4 border-outline shadow-md">
      {/* Collapsible Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-coin border-3 border-outline rounded-full shadow-[3px_3px_0_var(--outline-black)] hover:scale-110 transition-all duration-200 flex items-center justify-center z-10"
        aria-label={isCollapsed ? "Expand portfolio ticker" : "Collapse portfolio ticker"}
      >
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-outline" />
        ) : (
          <ChevronUp className="h-4 w-4 text-outline" />
        )}
      </button>

      {/* Scrolling Container - Pause on Hover */}
      {!isCollapsed && (
        <div className="group relative py-2">
          {/* Left Label */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 bg-coin/90 backdrop-blur-sm px-2.5 py-1 rounded-full border-2 border-outline shadow-[2px_2px_0_var(--outline-black)]">
            <Wallet className="h-3.5 w-3.5 text-outline" />
            <span className="text-xs font-body text-outline font-bold uppercase tracking-wide">Your Holdings</span>
          </div>

          <div className="ticker-scroll-container scroller ml-36 mr-36">
            <div className="ticker-scroll group-hover:paused">
              {duplicatedPositions.map((position, index) => {
                const isPositive = position.unrealizedPnL > 0.01
                const isNegative = position.unrealizedPnL < -0.01

                return (
                  <button
                    key={`${position.mint}-${index}`}
                    onClick={() => handleTokenClick(position.mint)}
                    className="ticker-item mario-badge flex-shrink-0 mx-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm border-3 border-outline rounded-lg shadow-[2px_2px_0_var(--outline-black)] hover:scale-105 hover:shadow-[3px_3px_0_var(--outline-black)] transition-all duration-200 active:scale-95"
                  >
                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                      {/* Token Logo */}
                      <TokenLogo
                        src={position.tokenImage || undefined}
                        alt={position.tokenName || position.tokenSymbol || 'Token'}
                        mint={position.mint}
                        className="w-6 h-6 flex-shrink-0 ring-2 ring-[var(--outline-black)]"
                      />

                      {/* Token Symbol */}
                      <span className="font-body text-outline text-sm font-bold tracking-wide">
                        {position.tokenSymbol || 'UNKNOWN'}
                      </span>

                      {/* Divider */}
                      <div className="w-px h-4 bg-outline/30" />

                      {/* Current Price */}
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Price</span>
                        <span className="text-xs font-mono font-bold text-foreground">
                          ${position.livePrice < 0.01 
                            ? position.livePrice.toExponential(2) 
                            : position.livePrice.toFixed(position.livePrice < 1 ? 6 : 2)}
                        </span>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-4 bg-outline/30" />

                      {/* P&L with Icon */}
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">P&L</span>
                        <div className={cn(
                          "flex items-center gap-1 text-xs font-bold",
                          isPositive && "text-[var(--luigi-green)]",
                          isNegative && "text-[var(--mario-red)]",
                          !isPositive && !isNegative && "text-muted-foreground"
                        )}>
                          {isPositive && <TrendingUp className="h-3 w-3" />}
                          {isNegative && <TrendingDown className="h-3 w-3" />}
                          <AnimatedNumber
                            value={position.unrealizedPnL}
                            prefix="$"
                            decimals={2}
                            className="font-mono"
                            colorize={false}
                          />
                          <span className="text-[10px]">
                            ({position.unrealizedPercent > 0 ? '+' : ''}{position.unrealizedPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right "View All" Button */}
          <button
            onClick={handleViewPortfolio}
            className="absolute right-12 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 bg-star/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border-3 border-outline shadow-[2px_2px_0_var(--outline-black)] hover:scale-105 hover:shadow-[3px_3px_0_var(--outline-black)] transition-all duration-200 active:scale-95"
          >
            <span className="text-xs font-body text-outline font-bold uppercase tracking-wide">View All</span>
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-outline/20">
              <span className="text-[10px] font-bold text-outline">{positionsWithLivePnL.length}</span>
            </div>
            <ExternalLink className="h-3 w-3 text-outline" />
          </button>

          {/* Gradient Fade Edges */}
          <div className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-[var(--pipe-green)] to-transparent pointer-events-none z-5" />
          <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-[var(--pipe-green)] to-transparent pointer-events-none z-5" />
        </div>
      )}
    </div>
  )
}
