"use client"

import React, { useState, useRef, useCallback, useMemo } from "react"
import { Virtuoso } from "react-virtuoso"
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

// Check if user prefers reduced motion
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

// Wallet emoji mapping for visual identification
const WALLET_EMOJIS = ['🟠', '🟢', '🔵', '🟡', '🟣', '🔴', '🟤', '⚫'] as const;

function getWalletEmoji(address: string): string {
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return WALLET_EMOJIS[hash % WALLET_EMOJIS.length];
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
  const walletEmoji = getWalletEmoji(activity.walletAddress);

  // Skip if no mint (invalid data)
  if (!tokenMint) {
    console.warn('Skipping activity without mint:', activity.id);
    return null;
  }

  const isBuy = activity.type === 'BUY';
  const amount = activity.solAmount ? parseFloat(activity.solAmount) : 0;
  const marketCapNum = activity.marketCap ? parseFloat(activity.marketCap) : 0;

  // Calculate amount bar percentage (max at 5 SOL = 100%)
  const amountBarPercent = Math.min((amount / 5) * 100, 100);

  return (
    <Link
      href={`/room/${tokenMint}`}
      className={cn(
        "grid grid-cols-[60px_100px_1fr_140px_80px] gap-3 px-4 py-2.5 hover:bg-[var(--background)] transition-colors cursor-pointer border-b border-pipe-300",
        isBuy ? "bg-luigi-green/5" : "bg-mario-red/5"
      )}
    >
      {/* Time */}
      <div className="flex items-center">
        <span className="text-xs font-bold text-pipe-700">
          {activity.timeAgo}
        </span>
      </div>

      {/* Wallet */}
      <div className="flex items-center gap-1.5">
        <span className="text-lg leading-none">{walletEmoji}</span>
        <span className="text-xs font-bold text-mario-red truncate">
          {walletLabel}
        </span>
      </div>

      {/* Token */}
      <div className="flex items-center gap-2 min-w-0">
        <TokenLogo
          src={tokenLogoURI || undefined}
          alt={tokenSymbol}
          mint={tokenMint}
          className="h-7 w-7 border-2 border-pipe-700 rounded flex-shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm text-pipe-900 truncate leading-tight">
            {tokenSymbol}
          </span>
          {activity.tokenAge && (
            <span className="text-[10px] text-luigi-green font-medium">
              {activity.tokenAge} old
            </span>
          )}
        </div>
      </div>

      {/* Amount (SOL) */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-6 bg-white border-2 border-pipe-700 rounded relative overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 transition-all",
              isBuy ? "bg-luigi-green" : "bg-mario-red"
            )}
            style={{ width: `${amountBarPercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-pipe-900 z-10 drop-shadow-sm">
              {amount.toFixed(2)} SOL
            </span>
          </div>
        </div>
      </div>

      {/* Market Cap */}
      <div className="flex items-center justify-end">
        <div className="text-right">
          <div className="text-[9px] text-pipe-600 font-medium">MCap</div>
          <div className="text-xs font-bold text-pipe-900 tabular-nums">
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
}

export function WalletActivityList({
  activities,
  isLoading,
  hasMore,
  onLoadMore,
  onCopyTrade,
  getWalletLabel,
  density // Keep for API compatibility but not used in new compact design
}: WalletActivityListProps) {
  const [copyingTrades, setCopyingTrades] = useState<Set<string>>(new Set())

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

  // Loading state - skeleton matches grid layout
  if (isLoading && activities.length === 0) {
    return (
      <div className="mario-card bg-white border-4 border-pipe-700 shadow-mario overflow-hidden h-full flex flex-col">
        {/* Column Headers */}
        <div className="grid grid-cols-[60px_100px_1fr_140px_80px] gap-3 px-4 py-2 bg-star-yellow border-b-4 border-pipe-700 flex-shrink-0">
          <div className="text-[10px] font-mario text-pipe-900 uppercase">Time</div>
          <div className="text-[10px] font-mario text-pipe-900 uppercase">Wallet</div>
          <div className="text-[10px] font-mario text-pipe-900 uppercase">Token</div>
          <div className="text-[10px] font-mario text-pipe-900 uppercase">Amount (SOL)</div>
          <div className="text-[10px] font-mario text-pipe-900 uppercase text-right">MCap</div>
        </div>

        {/* Loading Skeletons */}
        <div className="flex-1 overflow-y-auto">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="grid grid-cols-[60px_100px_1fr_140px_80px] gap-3 px-4 py-2.5 border-b border-pipe-300">
              <Skeleton className="h-4 w-10" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-6 w-full rounded" />
              <Skeleton className="h-4 w-12 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className="mario-card bg-white border-4 border-pipe-700 shadow-mario overflow-hidden h-full flex flex-col">
        {/* Column Headers */}
        <div className="grid grid-cols-[60px_100px_1fr_140px_80px] gap-3 px-4 py-2 bg-star-yellow border-b-4 border-pipe-700 flex-shrink-0">
          <div className="text-[10px] font-mario text-pipe-900 uppercase">Time</div>
          <div className="text-[10px] font-mario text-pipe-900 uppercase">Wallet</div>
          <div className="text-[10px] font-mario text-pipe-900 uppercase">Token</div>
          <div className="text-[10px] font-mario text-pipe-900 uppercase">Amount (SOL)</div>
          <div className="text-[10px] font-mario text-pipe-900 uppercase text-right">MCap</div>
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-pipe-900">No Activities Found</h3>
            <p className="text-sm text-pipe-700 font-semibold">
              Start tracking wallets to see their trading activities here
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mario-card bg-white border-4 border-pipe-700 shadow-mario overflow-hidden h-full flex flex-col">
      {/* Column Headers */}
      <div className="grid grid-cols-[60px_100px_1fr_140px_80px] gap-3 px-4 py-2 bg-star-yellow border-b-4 border-pipe-700 flex-shrink-0">
        <div className="text-[10px] font-mario text-pipe-900 uppercase">Time</div>
        <div className="text-[10px] font-mario text-pipe-900 uppercase">Wallet</div>
        <div className="text-[10px] font-mario text-pipe-900 uppercase">Token</div>
        <div className="text-[10px] font-mario text-pipe-900 uppercase">Amount (SOL)</div>
        <div className="text-[10px] font-mario text-pipe-900 uppercase text-right">MCap</div>
      </div>

      {/* Activity List */}
      <Virtuoso
        data={activities}
        overscan={200}
        style={{ height: '100%' }}
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
            <div className="p-3 text-center border-t-2 border-pipe-700 bg-[var(--background)]">
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-mario-red" />
            </div>
          ) : null
        }}
      />
    </div>
  )
}