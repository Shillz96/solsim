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
}

export function TradeTimeline({ tokenAddress, maxTrades = 10 }: TradeTimelineProps) {
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
    (trade) => trade.tokenAddress === tokenAddress
  ) || []).slice(0, maxTrades)

  if (!user || tokenTrades.length === 0) {
    return null
  }

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Your Recent Trades</h3>
        <Badge variant="outline" className="text-xs">{tokenTrades.length}</Badge>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent"></div>

        {/* Trade markers */}
        <div className="space-y-4">
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
                className="relative pl-10 pb-2"
              >
                {/* Trade marker dot */}
                <div
                  className={cn(
                    "absolute left-2 top-1 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
                    isBuy
                      ? "bg-green-500 shadow-lg shadow-green-500/50"
                      : "bg-red-500 shadow-lg shadow-red-500/50"
                  )}
                >
                  {isBuy ? (
                    <TrendingUp className="h-2.5 w-2.5 text-white" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 text-white" />
                  )}
                </div>

                {/* Trade info */}
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={isBuy ? "default" : "destructive"}
                          className={cn(
                            "text-xs font-semibold",
                            isBuy ? "bg-green-500/20 text-green-600 border-green-500/30" : ""
                          )}
                        >
                          {isBuy ? "BUY" : "SELL"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(trade.timestamp), { addSuffix: true })}
                        </span>
                      </div>

                      <div className="text-sm font-medium">
                        {formatTokenQuantity(parseFloat(trade.quantity))} tokens
                      </div>

                      <div className="text-xs text-muted-foreground mt-1">
                        for {parseFloat(trade.totalCost).toFixed(4)} SOL
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
                        <div className="text-sm font-semibold">
                          {hasProfit ? "+" : ""}
                          {pnl.toFixed(4)} SOL
                        </div>
                        <div className="text-xs">
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
      {tokenTrades.length === maxTrades && (
        <div className="text-center mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Showing last {maxTrades} trades • View all in History tab
          </p>
        </div>
      )}
    </Card>
  )
}
