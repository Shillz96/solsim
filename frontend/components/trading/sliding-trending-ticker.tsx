"use client"

import { useRouter } from "next/navigation"
import { TrendingUp, TrendingDown, Loader2, AlertCircle, Flame, ChevronUp, ChevronDown } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { TokenLogo } from "@/components/ui/token-logo"
import { useTrendingTokens } from "@/hooks/use-react-query-hooks"
import * as api from "@/lib/api"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import "@/styles/ticker.css"

/**
 * Mario-themed Sliding Trending Tokens Ticker
 *
 * Features:
 * - Horizontal auto-scrolling ticker
 * - Mario coin/badge styling
 * - Pause on hover
 * - Click to navigate to token
 * - Infinite smooth animation
 * - Collapsible with Mario-styled dropdown arrow
 * - Persistent visibility setting
 *
 * 2025 Design: Gamified ticker reminiscent of classic Mario level displays
 */
export function SlidingTrendingTicker() {
  const { data: trendingTokens, isLoading, error, refetch } = useQuery({
    queryKey: ['trending-ticker'],
    queryFn: () => {
      console.log('🎯 [TRENDING DEBUG] Fetching trending tokens...');
      return api.getTrendingTokens()
        .then(tokens => {
          console.log('🎯 [TRENDING DEBUG] API response:', {
            count: tokens?.length || 0,
            firstToken: tokens?.[0]
          });
          return tokens.slice(0, 20);
        })
        .catch(err => {
          console.error('🎯 [TRENDING DEBUG] API error:', {
            message: err.message,
            stack: err.stack
          });
          throw err;
        });
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 30000, // Refresh every 30 seconds
  })
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // Debug query state
  useEffect(() => {
    console.log('🎯 [TRENDING DEBUG] Query state:', {
      isLoading,
      hasError: !!error,
      errorMessage: error?.message,
      hasData: !!trendingTokens,
      tokenCount: trendingTokens?.length || 0,
      isVisible
    });
  }, [isLoading, error, trendingTokens, isVisible]);

  // Load visibility setting from localStorage
  useEffect(() => {
    const savedVisibility = localStorage.getItem('ticker-visible')
    if (savedVisibility !== null) {
      setIsVisible(JSON.parse(savedVisibility))
    }
  }, [])

  // Save visibility setting to localStorage
  const handleToggleVisibility = () => {
    const newVisibility = !isVisible
    setIsVisible(newVisibility)
    localStorage.setItem('ticker-visible', JSON.stringify(newVisibility))
  }

  const handleTokenClick = (tokenAddress: string) => {
    router.push(`/room/${tokenAddress}`)
  }

  // Don't render if not visible
  if (!isVisible) {
    return null
  }

  if (isLoading && !trendingTokens) {
    return (
      <div className="fixed top-[var(--navbar-height)] left-0 right-0 z-[95] overflow-hidden bg-gradient-to-r from-[var(--brick-brown)] to-[var(--brick-brown)]/80 border-4 border-[var(--outline-black)] rounded-lg p-4">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--star-yellow)]" />
          <span className="text-sm mario-font text-white">Loading Trending...</span>
        </div>
        {/* Mario-styled dropdown arrow */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--coin-gold)] border-3 border-[var(--outline-black)] rounded-full shadow-[3px_3px_0_var(--outline-black)] hover:scale-110 transition-all duration-200 flex items-center justify-center"
          aria-label={isCollapsed ? "Expand ticker" : "Collapse ticker"}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-[var(--outline-black)]" />
          ) : (
            <ChevronUp className="h-4 w-4 text-[var(--outline-black)]" />
          )}
        </button>
      </div>
    )
  }

  if (error || !trendingTokens || trendingTokens.length === 0) {
    return (
      <div className="fixed top-[var(--navbar-height)] left-0 right-0 z-[95] overflow-hidden bg-gradient-to-r from-[var(--brick-brown)] to-[var(--brick-brown)]/80 border-4 border-[var(--outline-black)] rounded-lg p-3">
        <Alert variant="destructive" className="border-none bg-transparent">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs flex items-center gap-2">
            Failed to load trending tokens
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
        {/* Mario-styled dropdown arrow */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--coin-gold)] border-3 border-[var(--outline-black)] rounded-full shadow-[3px_3px_0_var(--outline-black)] hover:scale-110 transition-all duration-200 flex items-center justify-center"
          aria-label={isCollapsed ? "Expand ticker" : "Collapse ticker"}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-[var(--outline-black)]" />
          ) : (
            <ChevronUp className="h-4 w-4 text-[var(--outline-black)]" />
          )}
        </button>
      </div>
    )
  }

  // Duplicate tokens for seamless infinite scroll
  const duplicatedTokens = [...trendingTokens, ...trendingTokens, ...trendingTokens]
  
  // Debug: Log token data to see what fields are available
  if (trendingTokens && trendingTokens.length > 0) {
    console.log('🔍 Trending token data sample:', trendingTokens[0])
  }

  return (
    <div className="fixed top-[var(--navbar-height)] left-0 right-0 z-[95] w-full overflow-hidden bg-gradient-to-r from-[var(--brick-brown)] to-[var(--brick-brown)]/80 border-b-4 border-[var(--outline-black)] shadow-md">
      {/* Scrolling Container - Pause on Hover */}
      <div className="group relative py-2">
        <div className="ticker-scroll-container">
          <div className="ticker-scroll group-hover:paused">
            {duplicatedTokens.map((token, index) => {
              const change = parseFloat(token.priceChange24h?.toString() || '0') || 0
              const isPositive = change > 0.01
              const isNegative = change < -0.01

              return (
                <button
                  key={`${token.mint}-${index}`}
                  onClick={() => handleTokenClick(token.mint)}
                  className="ticker-item mario-badge flex-shrink-0 mx-2 px-3 py-1.5 bg-[var(--coin-gold)] border-2 border-[var(--outline-black)] rounded-full shadow-[2px_2px_0_var(--outline-black)] hover:scale-110 hover:shadow-[3px_3px_0_var(--outline-black)] transition-all duration-200 active:scale-95 coin-bounce-hover"
                >
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    {/* Token Logo */}
                    <TokenLogo
                      src={token.logoURI || undefined}
                      alt={token.name || token.symbol || 'Token'}
                      mint={token.mint}
                      className="w-6 h-6 flex-shrink-0 ring-2 ring-[var(--outline-black)]"
                    />

                    {/* Token Symbol */}
                    <span className="mario-font text-[var(--outline-black)] text-sm tracking-wide">
                      {token.symbol || 'N/A'}
                    </span>

                    {/* Price */}
                    <div className="flex items-center gap-2">
                      <AnimatedNumber
                        value={token.priceUsd}
                        prefix="$"
                        decimals={token.priceUsd < 0.001 ? 6 : 4}
                        className="font-mono text-xs font-bold text-[var(--outline-black)]"
                        formatLarge={false}
                      />

                      {/* Price Change with Icon */}
                      <div className={cn(
                        "flex items-center gap-0.5 text-xs font-bold",
                        isPositive && "text-[var(--luigi-green)]",
                        isNegative && "text-[var(--mario-red)]"
                      )}>
                        {isPositive && <TrendingUp className="h-3 w-3" />}
                        {isNegative && <TrendingDown className="h-3 w-3" />}
                        <AnimatedNumber
                          value={change}
                          suffix="%"
                          prefix={change > 0.01 ? "+" : ""}
                          decimals={1}
                          className="font-mono"
                          colorize={false}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Gradient Fade Edges */}
        <div className="absolute top-0 left-0 h-full w-20 bg-gradient-to-r from-[var(--brick-brown)] to-transparent pointer-events-none z-5" />
        <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-[var(--brick-brown)] to-transparent pointer-events-none z-5" />
      </div>
    </div>
  )
}
