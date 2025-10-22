"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import * as Backend from "@/lib/types/backend"
import { formatNumber, formatUSD, formatPriceUSD, formatTokenQuantity } from "@/lib/format"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio } from "@/hooks/use-portfolio"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface RealtimeTradeStripProps {
  className?: string
  style?: React.CSSProperties
  maxTrades?: number // Maximum number of trades to display in the strip
}

export function RealtimeTradeStrip({
  className,
  style,
  maxTrades
}: RealtimeTradeStripProps) {
  const { user } = useAuth()
  const { prices: livePrices } = usePriceStreamContext()
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(true)

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
      <div className={cn("w-full bg-[#FFFAE9] border-t border-b border-border/20 py-2", className)} style={style}>
        <div className="flex items-center space-x-6 animate-pulse px-2">
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
      <div className={cn("w-full bg-[#FFFAE9] border-t border-b border-border/20 py-2", className)} style={style}>
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
        "w-full bg-[#FFFAE9] border-border/20 relative transition-all duration-300 ease-in-out",
        isExpanded ? "h-auto border-t border-b" : "h-8 border-t border-b-0",
        className
      )}
      style={style}
    >
      {/* Main Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center py-2.5 px-4 pr-16 gap-4 overflow-x-auto scrollbar-none">
              {positions.length === 0 ? (
                <div className="flex items-center justify-center w-full text-xs text-muted-foreground py-1">
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
                      className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 hover:bg-muted/50 transition-all duration-200 rounded-md px-2.5 py-1.5 group"
                    >
                      {position.tokenImage && (
                        <img
                          src={position.tokenImage}
                          alt={position.tokenSymbol || 'Token'}
                          className="w-5 h-5 rounded-full ring-1 ring-border group-hover:ring-2 transition-all"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}

                      <span className="font-semibold text-sm text-foreground">
                        {position.tokenSymbol || 'Unknown'}
                      </span>

                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-md transition-all",
                        isProfit
                          ? "bg-profit/10 text-profit ring-1 ring-profit/20"
                          : "bg-loss/10 text-loss ring-1 ring-loss/20"
                      )}>
                        {isProfit ? '+' : ''}{formatUSD(pnl.unrealizedUsd)}
                      </span>

                      <span className={cn(
                        "text-[10px] font-medium",
                        isProfit ? "text-profit/70" : "text-loss/70"
                      )}>
                        {isProfit ? '+' : ''}{pnl.unrealizedPercent.toFixed(2)}%
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "absolute right-3 p-1.5 rounded-md bg-muted/80 hover:bg-muted transition-all duration-200 hover:scale-105 z-20 ring-1 ring-border/50",
          isExpanded ? "top-1/2 -translate-y-1/2" : "top-1/2 -translate-y-1/2"
        )}
        aria-label={isExpanded ? "Collapse trade strip" : "Expand trade strip"}
      >
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}
