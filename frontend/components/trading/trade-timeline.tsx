"use client"

import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { TrendingUp, TrendingDown, Clock } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import * as api from "@/lib/api"
import { formatTokenQuantity, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface TradeTimelineProps {
  tokenAddress: string
  maxTrades?: number
  variant?: 'default' | 'compact'
}

export function TradeTimeline({ tokenAddress, maxTrades = 10, variant = 'default' }: TradeTimelineProps) {
  const { user } = useAuth()

  // Fetch user's trades for this token
  const { data: userTradesData } = useQuery({
    queryKey: ['user-token-trades', user?.id, tokenAddress],
    queryFn: () => api.getUserTrades(user!.id, 100, 0),
    enabled: !!user?.id,
    staleTime: 30000,
  })

  // Filter trades for this specific token
  const tokenTrades = (userTradesData?.trades?.filter(
    (trade) => trade.mint === tokenAddress
  ) || []).slice(0, maxTrades)

  if (!user || tokenTrades.length === 0) {
    return null
  }

  const isCompact = variant === 'compact'

  return (
    <div className={cn("mario-card bg-white", isCompact ? "p-3" : "p-4")}>
      <div className={cn("flex items-center gap-2", isCompact ? "mb-3" : "mb-4")}>
        <Clock className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4", "text-primary")} />
        <h3 className={cn("font-semibold", isCompact ? "text-xs" : "text-sm")}>Trade Activity</h3>
        <Badge variant="outline" className="text-xs ml-auto">{tokenTrades.length}</Badge>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className={cn(
          "absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent",
          isCompact ? "left-2.5" : "left-4"
        )}></div>

        {/* Trade markers */}
        <div className={cn(isCompact ? "space-y-2" : "space-y-4")}>
          {tokenTrades.map((trade, index) => {
            const isBuy = trade.action === 'BUY'
            const pnl = trade.realizedPnL ? parseFloat(trade.realizedPnL) : null
            const hasProfit = pnl !== null && pnl > 0

            return (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn("relative pb-1", isCompact ? "pl-6" : "pl-10")}
              >
                {/* Trade marker dot */}
                <div
                  className={cn(
                    "absolute top-0.5 rounded-full border-2 border-background flex items-center justify-center",
                    isBuy
                      ? "bg-green-500 shadow-lg shadow-green-500/50"
                      : "bg-red-500 shadow-lg shadow-red-500/50",
                    isCompact ? "left-1 w-3 h-3" : "left-2 w-4 h-4"
                  )}
                >
                  {isBuy ? (
                    <TrendingUp className={cn("text-white", isCompact ? "h-1.5 w-1.5" : "h-2.5 w-2.5")} />
                  ) : (
                    <TrendingDown className={cn("text-white", isCompact ? "h-1.5 w-1.5" : "h-2.5 w-2.5")} />
                  )}
                </div>

                {/* Trade info */}
                <div className={cn(
                  "bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors",
                  isCompact ? "p-2" : "p-3"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={cn("flex items-center gap-1.5", isCompact ? "mb-0.5" : "mb-1")}>
                        <Badge
                          variant={isBuy ? "default" : "destructive"}
                          className={cn(
                            "font-semibold",
                            isCompact ? "text-[10px] px-1.5 py-0" : "text-xs",
                            isBuy ? "bg-green-500/20 text-green-600 border-green-500/30" : ""
                          )}
                        >
                          {isBuy ? "BUY" : "SELL"}
                        </Badge>
                        {!isCompact && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      <div className={cn("font-medium", isCompact ? "text-xs" : "text-sm")}>
                        {formatTokenQuantity(parseFloat(trade.quantity))}
                      </div>

                      <div className={cn("text-muted-foreground", isCompact ? "text-[10px]" : "text-xs", "mt-0.5")}>
                        {parseFloat(trade.totalCost).toFixed(4)} SOL
                      </div>
                    </div>

                    {/* P&L indicator for sells */}
                    {!isBuy && pnl !== null && (
                      <div
                        className={cn(
                          "text-right",
                          hasProfit ? "text-green-600" : "text-red-600"
                        )}
                      >
                        <div className={cn("font-semibold", isCompact ? "text-xs" : "text-sm")}>
                          {hasProfit ? "+" : ""}
                          {pnl.toFixed(4)}
                        </div>
                        <div className={cn(isCompact ? "text-[9px]" : "text-xs")}>
                          {hasProfit ? "Profit" : "Loss"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Show more hint if max reached */}
      {tokenTrades.length === maxTrades && !isCompact && (
        <div className="text-center mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Showing last {maxTrades} trades • View all in History tab
          </p>
        </div>
      )}
    </div>
  )
}
