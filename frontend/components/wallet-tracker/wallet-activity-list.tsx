"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
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
  XCircle,
  Coins
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/enhanced-skeleton"
import { TokenLogo } from "@/components/ui/token-logo"
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

// Format market cap with K/M suffix
function formatMarketCap(mc: number): string {
  if (mc >= 1000000) {
    return `$${(mc / 1000000).toFixed(2)}M`
  }
  if (mc >= 1000) {
    return `$${(mc / 1000).toFixed(1)}K`
  }
  return `$${mc.toFixed(0)}`
}

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
        <div className="divide-y divide-border/30">
          {activities.map((activity, index) => {
            // Filter out SWAP types - only show BUY/SELL
            if (activity.type === 'SWAP') return null;

            // Get the main token (non-SOL token)
            const mainToken = activity.type === 'BUY'
              ? activity.tokenOut
              : activity.tokenIn;

            const tokenMint = mainToken.mint;
            const tokenSymbol = mainToken.symbol || 'Unknown';
            const tokenLogoURI = mainToken.logoURI;
            const walletLabel = getWalletLabel(activity.walletAddress);
            const priceChange = activity.priceChange24h ? parseFloat(activity.priceChange24h) : null;
            const isPositiveChange = priceChange !== null && priceChange >= 0;

            // Skip if no mint (invalid data)
            if (!tokenMint) {
              console.warn('Skipping activity without mint:', activity.id);
              return null;
            }

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={cn(
                  "group hover:bg-muted/20 transition-all",
                  activity.type === 'BUY' && "border-l-2 border-l-green-500/30",
                  activity.type === 'SELL' && "border-l-2 border-l-red-500/30"
                )}
              >
                <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-4">
                  {/* Time Column - Simplified */}
                  <div className="hidden sm:block w-12 text-xs text-muted-foreground flex-shrink-0">
                    {activity.timeAgo}
                  </div>

                  {/* Wallet Identifier - Small and subtle */}
                  <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    <div className={cn(
                      "h-2 w-2 rounded-full flex-shrink-0",
                      activity.type === 'BUY' ? "bg-green-500" : "bg-red-500"
                    )} />
                    <span className="text-xs text-muted-foreground font-medium">
                      {walletLabel}
                    </span>
                  </div>

                  {/* Main Token Section - PROMINENT */}
                  <Link
                    href={`/trade?token=${tokenMint}`}
                    className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                  >
                    {/* Token Logo - LARGER with fallback support */}
                    <TokenLogo
                      src={tokenLogoURI || undefined}
                      alt={tokenSymbol}
                      mint={tokenMint}
                      className="h-10 w-10 sm:h-12 sm:w-12 border border-border"
                    />

                    {/* Token Symbol & Price Change - PROMINENT */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Mobile: Show dot indicator */}
                        <div className={cn(
                          "sm:hidden h-1.5 w-1.5 rounded-full flex-shrink-0",
                          activity.type === 'BUY' ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="font-bold text-base sm:text-lg truncate">
                          {tokenSymbol}
                        </span>
                      </div>

                      {/* Price Change - Prominent & Color Coded */}
                      {priceChange !== null && (
                        <div className={cn(
                          "flex items-center gap-1 font-semibold text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 rounded",
                          isPositiveChange
                            ? "text-green-500 bg-green-500/10"
                            : "text-red-500 bg-red-500/10"
                        )}>
                          {isPositiveChange ? (
                            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          ) : (
                            <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          )}
                          {isPositiveChange ? '+' : ''}{priceChange.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Trade Size & Market Cap - RIGHT ALIGNED & PROMINENT */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                    {/* Trade Size (USD Amount) */}
                    {activity.priceUsd && (
                      <div className="text-right min-w-[80px]">
                        <div className="text-xs text-muted-foreground mb-0.5">Amount</div>
                        <div className="font-bold text-sm sm:text-base">
                          {formatUSD(parseFloat(activity.priceUsd))}
                        </div>
                      </div>
                    )}

                    {/* Market Cap - PROMINENT */}
                    {activity.marketCap && (
                      <div className="text-right min-w-[80px]">
                        <div className="text-xs text-muted-foreground mb-0.5">$MC</div>
                        <div className="font-semibold text-sm sm:text-base text-primary">
                          {formatMarketCap(parseFloat(activity.marketCap))}
                        </div>
                      </div>
                    )}

                    {/* Actions - Cleaner */}
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              copyToClipboard(activity.walletAddress, "Wallet address");
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy wallet</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(`https://solscan.io/tx/${activity.signature}`, '_blank');
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View transaction</TooltipContent>
                      </Tooltip>

                      {activity.type === 'BUY' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.preventDefault();
                            handleCopyTrade(activity);
                          }}
                          disabled={copyingTrades.has(activity.id)}
                          className="gap-1.5 ml-1 h-8"
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
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Load More Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="p-4 text-center border-t border-border/30">
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