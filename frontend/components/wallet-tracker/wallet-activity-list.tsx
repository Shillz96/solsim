"use client"

import { useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  ExternalLink,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/enhanced-skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatUSD, formatNumber } from "@/lib/format"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import type { WalletActivity } from "./types"

interface WalletActivityListProps {
  activities: WalletActivity[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onCopyTrade: (activity: WalletActivity) => void
  getWalletLabel: (address: string) => string
}

export function WalletActivityList({
  activities,
  isLoading,
  hasMore,
  onLoadMore,
  onCopyTrade,
  getWalletLabel
}: WalletActivityListProps) {
  const [copyingTrades, setCopyingTrades] = useState<Set<string>>(new Set())
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Infinite scroll trigger
  useIntersectionObserver(loadMoreRef, onLoadMore, {
    enabled: hasMore && !isLoading
  })

  const handleCopyTrade = async (activity: WalletActivity) => {
    setCopyingTrades(prev => new Set(prev).add(activity.id))

    try {
      await onCopyTrade(activity)
    } finally {
      setCopyingTrades(prev => {
        const next = new Set(prev)
        next.delete(activity.id)
        return next
      })
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    // Could add toast notification here
  }

  // Loading state
  if (isLoading && activities.length === 0) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <Card className="p-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Activities Found</h3>
        <p className="text-sm text-muted-foreground">
          Start tracking wallets to see their trading activities here
        </p>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <div className="divide-y divide-border/50">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="group hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 p-3">
                {/* Time Column */}
                <div className="w-12 text-xs text-muted-foreground text-center">
                  {activity.timeAgo}
                </div>

                {/* Trade Icon */}
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full",
                  activity.type === 'BUY' ? "bg-green-500/10" :
                  activity.type === 'SELL' ? "bg-red-500/10" :
                  "bg-blue-500/10"
                )}>
                  {activity.type === 'BUY' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : activity.type === 'SELL' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-blue-500" />
                  )}
                </div>

                {/* Token Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Token symbols */}
                    <div className="flex items-center gap-1">
                      {activity.tokenIn.symbol && (
                        <>
                          <span className="font-medium text-sm">
                            {activity.tokenIn.symbol}
                          </span>
                          <span className="text-xs text-muted-foreground">→</span>
                        </>
                      )}
                      {activity.tokenOut.symbol && (
                        <span className="font-medium text-sm text-primary">
                          {activity.tokenOut.symbol}
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    {activity.tokenOut.amount && (
                      <Badge variant="secondary" className="text-xs">
                        {formatNumber(parseFloat(activity.tokenOut.amount))}
                      </Badge>
                    )}

                    {/* Program badge */}
                    {activity.program && (
                      <Badge variant="outline" className="text-xs">
                        {activity.program}
                      </Badge>
                    )}
                  </div>

                  {/* Wallet info */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {getWalletLabel(activity.walletAddress)}
                    </span>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => copyToClipboard(activity.walletAddress, "Wallet address")}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Copy wallet address</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`https://solscan.io/tx/${activity.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>View on Solscan</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Price & Stats */}
                <div className="text-right">
                  {/* USD Value */}
                  {activity.priceUsd && (
                    <div className="font-semibold text-sm">
                      {formatUSD(parseFloat(activity.priceUsd))}
                    </div>
                  )}

                  {/* Market Cap */}
                  {activity.marketCap && (
                    <div className="text-xs text-muted-foreground">
                      MC: {formatUSD(parseFloat(activity.marketCap))}
                    </div>
                  )}

                  {/* Price Change */}
                  {activity.priceChange24h && (
                    <div className={cn(
                      "text-xs font-medium flex items-center justify-end gap-0.5",
                      parseFloat(activity.priceChange24h) >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {parseFloat(activity.priceChange24h) >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(parseFloat(activity.priceChange24h)).toFixed(1)}%
                    </div>
                  )}
                </div>

                {/* Copy Trade Button */}
                {activity.type === 'BUY' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyTrade(activity)}
                    disabled={copyingTrades.has(activity.id)}
                    className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copyingTrades.has(activity.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copy
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load More Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="p-4 text-center">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <span className="text-xs text-muted-foreground">Loading more...</span>
            )}
          </div>
        )}
      </Card>
    </TooltipProvider>
  )
}