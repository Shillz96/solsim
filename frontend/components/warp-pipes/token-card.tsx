/**
 * Token Card Component - Mario-themed compact token display card
 *
 * Information-dense card showing metrics similar to Axiom:
 * - Time ago, logo, name/symbol
 * - Contract address
 * - Security, liquidity, watchers metrics
 * - Hot score / bonding curve progress
 * Uses Mario theme with bold borders and vibrant colors
 */

"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  Lock,
  Droplet,
  Users,
  TrendingUp,
  Clock,
  ExternalLink,
  Heart,
  Shield,
  Zap
} from "lucide-react"
import type { TokenRow } from "@/lib/types/warp-pipes"
import {
  getLiquidityHealth,
  getPriceImpactHealth,
  getSecurityHealth
} from "@/lib/types/warp-pipes"

interface TokenCardProps {
  token: TokenRow
  onToggleWatch: (mint: string, isWatched: boolean) => Promise<void>
  rank?: number
  className?: string
}

// Helper to format time ago
function getTimeAgo(timestamp: string): string {
  const now = new Date().getTime()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

// Helper to format number compactly
function formatCompact(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

export function TokenCard({ token, onToggleWatch, rank, className }: TokenCardProps) {
  // Health calculations
  const liquidityHealth = getLiquidityHealth(token.liqUsd)
  const priceImpactHealth = getPriceImpactHealth(token.priceImpactPctAt1pct)
  const securityHealth = getSecurityHealth(token.freezeRevoked, token.mintRenounced)

  // Time ago
  const timeAgo = getTimeAgo(token.firstSeenAt)

  // Shortened address
  const shortMint = `${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`

  // State colors
  const stateBorderColors = {
    bonded: "border-coin-yellow-500",
    graduating: "border-star-yellow-500",
    new: "border-luigi-green-500",
  }

  return (
    <Link href={`/room/${token.mint}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "bg-card rounded-lg border-2 shadow-sm hover:shadow-md cursor-pointer",
          "transition-all duration-200 hover:border-mario-red-400",
          stateBorderColors[token.state],
          className
        )}
      >
        <div className="p-2.5">
          {/* Top row: Time + Logo + Name + Watch */}
          <div className="flex items-start gap-2 mb-2">
            {/* Time ago */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="font-mono">{timeAgo}</span>
            </div>

            {/* Token Logo */}
            <div className="flex-shrink-0">
              {token.logoURI ? (
                <Image
                  src={token.logoURI}
                  alt={token.symbol || "Token"}
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-pipe-300"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    const fallback = target.nextElementSibling as HTMLElement
                    if (fallback) fallback.style.display = "flex"
                  }}
                />
              ) : null}
              <div
                className={`w-8 h-8 rounded-full bg-pipe-100 border-2 border-pipe-300 flex items-center justify-center ${
                  token.logoURI ? "hidden" : "flex"
                }`}
              >
                <span className="text-xs">🪙</span>
              </div>
            </div>

            {/* Token Name/Symbol */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm truncate">{token.symbol || "UNKNOWN"}</h3>
              <p className="text-xs text-muted-foreground truncate">{token.name || "Unknown"}</p>
            </div>

            {/* Watch button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleWatch(token.mint, token.isWatched || false)
              }}
              className={cn(
                "flex-shrink-0 p-1 rounded-full transition-colors",
                token.isWatched
                  ? "text-mario-red-500 hover:text-mario-red-600"
                  : "text-pipe-400 hover:text-pipe-600"
              )}
            >
              <Heart className={cn("w-4 h-4", token.isWatched && "fill-current")} />
            </button>
          </div>

          {/* Metrics row: Icons with status */}
          <div className="flex items-center gap-3 mb-2 text-xs">
            {/* Security */}
            <div
              className={cn(
                "flex items-center gap-1",
                securityHealth === "green" && "text-green-600",
                securityHealth === "yellow" && "text-yellow-600",
                securityHealth === "red" && "text-red-600"
              )}
              title={`Freeze: ${token.freezeRevoked ? "✓" : "✗"} | Mint: ${token.mintRenounced ? "✓" : "✗"}`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px]">
                {token.freezeRevoked && token.mintRenounced ? "✓" : "⚠"}
              </span>
            </div>

            {/* Liquidity */}
            {token.liqUsd !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-1",
                  liquidityHealth === "green" && "text-green-600",
                  liquidityHealth === "yellow" && "text-yellow-600",
                  liquidityHealth === "red" && "text-red-600"
                )}
                title={`Liquidity: ${formatCompact(token.liqUsd)}`}
              >
                <Droplet className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px]">{formatCompact(token.liqUsd)}</span>
              </div>
            )}

            {/* Price Impact */}
            {token.priceImpactPctAt1pct !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-1",
                  priceImpactHealth === "green" && "text-green-600",
                  priceImpactHealth === "yellow" && "text-yellow-600",
                  priceImpactHealth === "red" && "text-red-600"
                )}
                title={`Price Impact: ${token.priceImpactPctAt1pct.toFixed(2)}%`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px]">{token.priceImpactPctAt1pct.toFixed(1)}%</span>
              </div>
            )}

            {/* Watchers */}
            <div className="flex items-center gap-1 text-pipe-600" title={`${token.watcherCount} watchers`}>
              <Users className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px]">{token.watcherCount}</span>
            </div>

            {/* Hot Score */}
            <div className="flex items-center gap-1 text-star-yellow-600" title={`Hot Score: ${token.hotScore}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px]">{Math.floor(token.hotScore)}</span>
            </div>
          </div>

          {/* Contract address */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <span className="font-mono text-[10px]">{shortMint}</span>
            <ExternalLink className="w-3 h-3" />
          </div>

          {/* Progress bar for bonding curve OR pool age for new tokens */}
          {token.state === "bonded" && token.bondingCurveProgress !== undefined ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Bonding Progress</span>
                <span className="font-bold text-coin-yellow-700">{token.bondingCurveProgress.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-pipe-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-coin-yellow-500 transition-all duration-300"
                  style={{ width: `${Math.min(token.bondingCurveProgress, 100)}%` }}
                />
              </div>
            </div>
          ) : token.state === "new" && token.poolAgeMin !== undefined ? (
            <div className="text-[10px] text-muted-foreground">
              Pool Age: <span className="font-mono font-semibold">{token.poolAgeMin}m</span>
            </div>
          ) : null}
        </div>
      </motion.div>
    </Link>
  )
}

/**
 * Token Card Skeleton - Loading state
 */
export function TokenCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border-2 border-pipe-300 shadow-sm p-2.5 animate-pulse">
      {/* Top row */}
      <div className="flex items-start gap-2 mb-2">
        <div className="h-3 w-8 bg-pipe-200 rounded" />
        <div className="w-8 h-8 rounded-full bg-pipe-200" />
        <div className="flex-1">
          <div className="h-3 bg-pipe-200 rounded w-20 mb-1" />
          <div className="h-2 bg-pipe-100 rounded w-24" />
        </div>
        <div className="w-4 h-4 rounded-full bg-pipe-200" />
      </div>
      {/* Metrics row */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-3 w-8 bg-pipe-100 rounded" />
        <div className="h-3 w-10 bg-pipe-100 rounded" />
        <div className="h-3 w-8 bg-pipe-100 rounded" />
        <div className="h-3 w-6 bg-pipe-100 rounded" />
        <div className="h-3 w-6 bg-pipe-100 rounded" />
      </div>
      {/* Address row */}
      <div className="h-2 bg-pipe-100 rounded w-24 mb-2" />
      {/* Progress bar */}
      <div className="h-1.5 bg-pipe-100 rounded w-full" />
    </div>
  )
}
