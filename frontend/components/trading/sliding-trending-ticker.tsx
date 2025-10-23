"use client"

import { useRouter } from "next/navigation"
import { TrendingUp, TrendingDown, Loader2, AlertCircle, Flame } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { TokenLogo } from "@/components/ui/token-logo"
import { useTrendingTokens } from "@/hooks/use-react-query-hooks"
import { cn } from "@/lib/utils"

/**
 * Mario-themed Sliding Trending Tokens Ticker
 *
 * Features:
 * - Horizontal auto-scrolling ticker
 * - Mario coin/badge styling
 * - Pause on hover
 * - Click to navigate to token
 * - Infinite smooth animation
 *
 * 2025 Design: Gamified ticker reminiscent of classic Mario level displays
 */
export function SlidingTrendingTicker() {
  const { data: trendingTokens, isLoading, error, refetch } = useTrendingTokens(20)
  const router = useRouter()

  const handleTokenClick = (tokenAddress: string) => {
    router.push(`/trade?token=${tokenAddress}`)
  }

  if (isLoading && !trendingTokens) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-[var(--brick-brown)] to-[var(--brick-brown)]/80 border-4 border-[var(--outline-black)] rounded-lg p-4">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--star-yellow)]" />
          <span className="text-sm mario-font text-white">Loading Trending...</span>
        </div>
      </div>
    )
  }

  if (error || !trendingTokens || trendingTokens.length === 0) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-[var(--brick-brown)] to-[var(--brick-brown)]/80 border-4 border-[var(--outline-black)] rounded-lg p-3">
        <Alert variant="destructive" className="border-none bg-transparent">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs flex items-center gap-2">
            Failed to load trending tokens
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Duplicate tokens for seamless infinite scroll
  const duplicatedTokens = [...trendingTokens, ...trendingTokens, ...trendingTokens]

  return (
    <div className="sticky top-[72px] z-40 overflow-hidden bg-gradient-to-r from-[var(--brick-brown)] to-[var(--brick-brown)]/80 border-b-4 border-[var(--outline-black)] shadow-md">
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
                  className="ticker-item mario-badge flex-shrink-0 mx-2 px-3 py-1.5 bg-[var(--coin-gold)] border-2 border-[var(--outline-black)] rounded-full shadow-md hover:scale-110 hover:shadow-xl transition-all duration-200 active:scale-95 coin-bounce-hover"
                >
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    {/* Token Logo */}
                    <TokenLogo
                      src={token.logoURI || undefined}
                      alt={token.name || 'Token'}
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

      <style jsx>{`
        .ticker-scroll-container {
          overflow: hidden;
          width: 100%;
        }

        .ticker-scroll {
          display: flex;
          animation: scroll-left 60s linear infinite;
        }

        .ticker-scroll.paused {
          animation-play-state: paused;
        }

        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .ticker-item {
          animation: none;
        }

        .coin-bounce-hover:hover {
          animation: coin-flip 0.6s ease-in-out;
        }

        @keyframes coin-flip {
          0%, 100% {
            transform: scale(1.1) rotateY(0deg);
          }
          50% {
            transform: scale(1.15) rotateY(180deg);
          }
        }

        /* Prevent animation on reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          .ticker-scroll {
            animation: none;
          }
          .coin-bounce-hover:hover {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
