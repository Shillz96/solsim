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

// Memoized activity row component - Photon-style ultra-compact layout
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

  // Calculate amount bar width (max 100px for 10+ SOL)
  const amountBarWidth = Math.min((amount / 10) * 100, 100);

  return (
    <Link
      href={`/room/${tokenMint}`}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 hover:bg-pipe-100/50 transition-colors cursor-pointer border-l-2",
        isBuy ? "border-l-luigi-green" : "border-l-mario-red"
      )}
    >
      {/* Time */}
      <div className="w-10 text-xs text-pipe-700 font-medium flex-shrink-0">
        {activity.timeAgo}
      </div>

      {/* Wallet Emoji + Label */}
      <div className="flex items-center gap-1.5 min-w-[80px] flex-shrink-0">
        <span className="text-base">{walletEmoji}</span>
        <span className="text-xs font-bold text-mario-red truncate max-w-[60px]">
          {walletLabel}
        </span>
      </div>

      {/* Token Logo + Symbol + Age */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TokenLogo
          src={tokenLogoURI || undefined}
          alt={tokenSymbol}
          mint={tokenMint}
          className="h-6 w-6 border border-pipe-300 flex-shrink-0"
        />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-sm text-pipe-900 truncate">
            {tokenSymbol}
          </span>
          {activity.tokenAge && (
            <span className="text-xs text-luigi-green font-medium flex-shrink-0">
              · {activity.tokenAge}
            </span>
          )}
        </div>
      </div>

      {/* Amount with visual bar indicator */}
      <div className="flex items-center gap-2 min-w-[100px] flex-shrink-0">
        <div className="relative w-20 h-4 bg-pipe-100 rounded overflow-hidden border border-pipe-300">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-r",
              "bg-gradient-to-r",
              isBuy
                ? "from-luigi-green/80 to-luigi-green"
                : "from-mario-red/80 to-mario-red"
            )}
            style={{
              width: `${amountBarWidth}%`,
              backgroundImage: isBuy
                ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                : 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'
            }}
          />
        </div>
        <span className={cn(
          "text-xs font-bold tabular-nums w-12 text-right",
          isBuy ? "text-luigi-green" : "text-mario-red"
        )}>
          {amount.toFixed(4)}
        </span>
      </div>

      {/* Market Cap */}
      <div className="text-right w-16 flex-shrink-0">
        <span className="text-xs font-semibold text-pipe-900 tabular-nums">
          {formatMarketCap(marketCapNum)}
        </span>
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

  // Loading state - skeleton heights match ultra-compact row (~32px total)
  if (isLoading && activities.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 h-[32px] border-b border-pipe-200">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-3 w-16" />
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
    <Card className="overflow-hidden border-4 border-pipe-700 shadow-mario">
      <Virtuoso
        data={activities}
        overscan={200}
        style={{ height: '600px' }}
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
            <div className="p-2 text-center border-t border-pipe-300">
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-pipe-700" />
            </div>
          ) : null
        }}
      />
    </Card>
  )
}