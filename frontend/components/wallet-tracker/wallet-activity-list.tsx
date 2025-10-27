"use client"

import React, { useState, useRef, useCallback, useMemo } from "react"
import { Virtuoso } from "react-virtuoso"
import Link from "next/link"
import Image from "next/image"
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
  Coins,
  Circle
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

// Check if user prefers reduced motion
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

// Wallet color mapping for visual identification
const WALLET_COLORS = [
  'text-orange-500',
  'text-green-500',
  'text-blue-500',
  'text-yellow-500',
  'text-purple-500',
  'text-red-500',
  'text-amber-700',
  'text-[var(--outline-black)]/80'
] as const;

function getWalletColor(address: string): string {
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return WALLET_COLORS[hash % WALLET_COLORS.length];
}

// Memoized activity row component - Clean Mario-themed layout
const ActivityRow = React.memo(function ActivityRow({
  activity,
  onCopyTrade,
  copyingTrades,
  getWalletLabel,
  copyToClipboard,
  density = 'comfortable'
}: {
  activity: WalletActivity
  onCopyTrade: (activity: WalletActivity) => void
  copyingTrades: Set<string>
  getWalletLabel: (address: string) => string
  copyToClipboard: (text: string, label: string) => void
  density?: 'comfortable' | 'compact'
}) {
  // Get the main token (non-SOL token)
  const mainToken = activity.type === 'BUY'
    ? activity.tokenOut
    : activity.tokenIn;

  const tokenMint = mainToken.mint;
  const tokenSymbol = mainToken.symbol || 'Unknown';
  const tokenLogoURI = mainToken.logoURI;
  const walletLabel = getWalletLabel(activity.walletAddress);
  const walletColor = getWalletColor(activity.walletAddress);

  // Skip if no mint (invalid data)
  if (!tokenMint) {
    console.warn('Skipping activity without mint:', activity.id);
    return null;
  }

  const isBuy = activity.type === 'BUY';
  const amount = activity.solAmount ? parseFloat(activity.solAmount) : 0;
  const marketCapNum = activity.marketCap ? parseFloat(activity.marketCap) : 0;

  return (
    <Link
      href={`/room/${tokenMint}`}
      className="grid grid-cols-[50px_80px_1fr_80px_60px] sm:grid-cols-[60px_100px_1fr_100px_80px] gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 bg-card border-2 border-outline rounded-lg shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
      aria-label={`${isBuy ? 'Buy' : 'Sell'} ${amount.toFixed(2)} SOL of ${tokenSymbol} by ${walletLabel}`}
    >
      {/* Time */}
      <div className="flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-bold text-outline cursor-help">
                {activity.timeAgo}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Wallet */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Circle className={cn("h-4 w-4 flex-shrink-0", walletColor)} fill="currentColor" />
        <span className="text-xs font-bold text-mario truncate">
          {walletLabel}
        </span>
      </div>

      {/* Token */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="bg-sky border-2 border-outline rounded-lg p-1 flex-shrink-0">
          <TokenLogo
            src={tokenLogoURI || undefined}
            alt={tokenSymbol}
            mint={tokenMint}
            className="h-5 w-5"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm text-outline truncate leading-tight">
            {tokenSymbol}
          </span>
          {activity.tokenAge && (
            <span className="text-[10px] text-luigi font-medium">
              {activity.tokenAge} old
            </span>
          )}
        </div>
      </div>

      {/* Amount (SOL) - Simple colored number */}
      <div className="flex items-center justify-end gap-1">
        {isBuy ? (
          <TrendingUp className="h-3 w-3 text-luigi flex-shrink-0" />
        ) : (
          <TrendingDown className="h-3 w-3 text-mario flex-shrink-0" />
        )}
        <span className={cn(
          "text-sm font-bold font-mono tabular-nums",
          isBuy ? "text-luigi" : "text-mario"
        )}>
          {amount.toFixed(2)} SOL
        </span>
      </div>

      {/* Market Cap */}
      <div className="flex items-center justify-end">
        <div className="text-right">
          <div className="text-[9px] text-outline font-medium">MCap</div>
          <div className="text-xs font-bold text-outline tabular-nums">
            {formatMarketCap(marketCapNum)}
          </div>
        </div>
      </div>
    </Link>
  );
})

interface WalletActivityListProps {
  activities: WalletActivity[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onCopyTrade: (activity: WalletActivity) => void
  getWalletLabel: (address: string) => string
  density?: 'comfortable' | 'compact'
  emptyMessage?: string
  filterType?: string
}

export function WalletActivityList({
  activities,
  isLoading,
  hasMore,
  onLoadMore,
  onCopyTrade,
  getWalletLabel,
  density, // Keep for API compatibility but not used in new compact design
  emptyMessage,
  filterType
}: WalletActivityListProps) {
  const [copyingTrades, setCopyingTrades] = useState<Set<string>>(new Set())

  // Filter out SWAP activities at data level for better performance
  const filteredActivities = useMemo(() =>
    activities.filter(activity => activity.type !== 'SWAP'),
    [activities]
  )

  const handleCopyTrade = useCallback(async (activity: WalletActivity) => {
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
  }, [onCopyTrade])

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    // Could add toast notification here
  }, [])

  // Loading state - skeleton matches grid layout
  if (isLoading && filteredActivities.length === 0) {
    return (
      <div className="bg-sky/20 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] overflow-hidden h-full flex flex-col">
        {/* Column Headers */}
        <div className="grid grid-cols-[50px_80px_1fr_80px_60px] sm:grid-cols-[60px_100px_1fr_100px_80px] gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-star border-b-4 border-outline flex-shrink-0">
            <div className="text-[10px] font-mario text-outline uppercase">Time</div>
            <div className="text-[10px] font-mario text-outline uppercase">Wallet</div>
            <div className="text-[10px] font-mario text-outline uppercase">Token</div>
            <div className="text-[10px] font-mario text-outline uppercase text-right">Amount</div>
            <div className="text-[10px] font-mario text-outline uppercase text-right">MCap</div>
        </div>

        {/* Loading Skeletons */}
        <div className="flex-1 overflow-y-auto min-h-0 relative">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="grid grid-cols-[50px_80px_1fr_80px_60px] sm:grid-cols-[60px_100px_1fr_100px_80px] gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-[var(--pipe-300)]">
              <Skeleton className="h-4 w-10" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-16 ml-auto" />
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (filteredActivities.length === 0) {
    return (
      <div className="bg-sky/20 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] overflow-hidden h-full flex flex-col">
        {/* Column Headers */}
        <div className="grid grid-cols-[50px_80px_1fr_80px_60px] sm:grid-cols-[60px_100px_1fr_100px_80px] gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-star border-b-4 border-outline flex-shrink-0">
            <div className="text-[10px] font-mario text-outline uppercase">Time</div>
            <div className="text-[10px] font-mario text-outline uppercase">Wallet</div>
            <div className="text-[10px] font-mario text-outline uppercase">Token</div>
            <div className="text-[10px] font-mario text-outline uppercase text-right">Amount</div>
            <div className="text-[10px] font-mario text-outline uppercase text-right">MCap</div>
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            <div className="bg-mario border-2 border-outline rounded-lg p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
              <Image src="/icons/mario/eyes.png" alt="No Activities" width={32} height={32} />
            </div>
            <h3 className="text-lg font-mario font-bold mb-2 text-outline">NO ACTIVITIES FOUND</h3>
            <p className="text-sm text-muted-foreground font-bold">
              {emptyMessage || (filterType ? `No ${filterType.toLowerCase()} activities found. Try adjusting your filters.` : "Start tracking wallets to see their trading activities here")}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-sky/20 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] overflow-hidden h-full flex flex-col">
      {/* Column Headers */}
      <div className="grid grid-cols-[50px_80px_1fr_80px_60px] sm:grid-cols-[60px_100px_1fr_100px_80px] gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-star border-b-4 border-outline flex-shrink-0">
            <div className="text-[10px] font-mario text-outline uppercase">Time</div>
            <div className="text-[10px] font-mario text-outline uppercase">Wallet</div>
            <div className="text-[10px] font-mario text-outline uppercase">Token</div>
            <div className="text-[10px] font-mario text-outline uppercase text-right">Amount</div>
            <div className="text-[10px] font-mario text-outline uppercase text-right">MCap</div>
      </div>

      {/* Activity List - Fixed height container */}
      <div className="flex-1 min-h-0 relative">
        <Virtuoso
          data={filteredActivities}
          overscan={20}
          style={{ height: '100%', width: '100%' }}
          itemContent={(index, activity) => (
            <ActivityRow
              activity={activity}
              onCopyTrade={handleCopyTrade}
              copyingTrades={copyingTrades}
              getWalletLabel={getWalletLabel}
              copyToClipboard={copyToClipboard}
              density={density}
            />
          )}
          endReached={hasMore ? onLoadMore : undefined}
          components={{
            Footer: () => hasMore && isLoading ? (
              <div className="py-4 border-t-2 border-outline bg-card">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-mario" />
                  <span className="text-sm font-semibold text-outline">Loading more activities...</span>
                </div>
              </div>
            ) : !hasMore && filteredActivities.length > 0 ? (
              <div className="py-3 text-center border-t-2 border-outline bg-star/20">
                <span className="text-xs font-bold text-outline">End of activity feed</span>
              </div>
            ) : null
          }}
        />
      </div>
    </div>
  )
}
