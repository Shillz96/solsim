/**
 * Token Card Component - Mario-themed horizontal token display card
 *
 * Pump.fun-inspired horizontal layout showing:
 * - Large token logo
 * - Symbol/name with time
 * - Comprehensive metrics (security, liquidity, watchers, hot score)
 * - Bonding curve progress
 * Uses Mario theme with bold borders and vibrant colors
 */

"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  Droplet,
  Users,
  TrendingUp,
  Clock,
  Heart,
  Shield,
  Zap,
  Copy,
  CheckCircle,
  XCircle,
  Twitter,
  MessageCircle,
  Globe,
  DollarSign,
  BarChart3,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { useState } from "react"
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
  const [imgError, setImgError] = useState(false)
  const [copied, setCopied] = useState(false)

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

  const stateGradients = {
    bonded: "from-coin-yellow-50 to-white",
    graduating: "from-star-yellow-50 to-white",
    new: "from-luigi-green-50 to-white",
  }

  const handleCopyMint = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(token.mint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Link href={`/room/${token.mint}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "bg-gradient-to-r rounded-xl border-3 shadow-mario cursor-pointer",
          "transition-all duration-200 hover:shadow-mario-lg hover:-translate-y-1",
          "hover:border-mario-red-500",
          stateBorderColors[token.state],
          stateGradients[token.state],
          className
        )}
      >
        <div className="p-4">
          {/* Horizontal Layout */}
          <div className="flex items-center gap-4">
            {/* Large Token Logo */}
            <div className="flex-shrink-0">
              {!imgError && token.logoURI ? (
                <img
                  src={token.logoURI}
                  alt={token.symbol || "Token"}
                  className="w-16 h-16 rounded-full border-3 border-pipe-400 bg-white object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pipe-200 to-pipe-300 border-3 border-pipe-400 flex items-center justify-center">
                  <span className="text-2xl">🪙</span>
                </div>
              )}
            </div>

            {/* Token Info & Metrics */}
            <div className="flex-1 min-w-0">
              {/* Top Row: Symbol, Name, Time */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg text-pipe-900">
                  {token.symbol || "UNKNOWN"}
                </h3>
                <span className="text-sm text-pipe-600 truncate max-w-[200px]">
                  {token.name || "Unknown Token"}
                </span>
                <div className="flex items-center gap-1 text-xs text-pipe-500 ml-auto">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono font-semibold">{timeAgo}</span>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="flex items-center gap-4 mb-2">
                {/* Security Status */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg border-2",
                    securityHealth === "green" && "bg-green-50 border-green-500 text-green-700",
                    securityHealth === "yellow" && "bg-yellow-50 border-yellow-500 text-yellow-700",
                    securityHealth === "red" && "bg-red-50 border-red-500 text-red-700"
                  )}
                  title={`Freeze: ${token.freezeRevoked ? "Revoked" : "Active"} | Mint: ${token.mintRenounced ? "Renounced" : "Active"}`}
                >
                  {token.freezeRevoked && token.mintRenounced ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span className="text-xs font-bold">
                    {token.freezeRevoked && token.mintRenounced ? "SAFE" : "RISK"}
                  </span>
                </div>

                {/* Liquidity */}
                {token.liqUsd !== undefined && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-lg border-2",
                      liquidityHealth === "green" && "bg-green-50 border-green-400",
                      liquidityHealth === "yellow" && "bg-yellow-50 border-yellow-400",
                      liquidityHealth === "red" && "bg-red-50 border-red-400"
                    )}
                    title={`Liquidity: ${formatCompact(token.liqUsd)}`}
                  >
                    <Droplet className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-pipe-900">{formatCompact(token.liqUsd)}</span>
                  </div>
                )}

                {/* Price Impact */}
                {token.priceImpactPctAt1pct !== undefined && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-lg border-2",
                      priceImpactHealth === "green" && "bg-green-50 border-green-400",
                      priceImpactHealth === "yellow" && "bg-yellow-50 border-yellow-400",
                      priceImpactHealth === "red" && "bg-red-50 border-red-400"
                    )}
                    title={`Price Impact: ${token.priceImpactPctAt1pct.toFixed(2)}%`}
                  >
                    <Zap className="w-4 h-4 text-star-yellow-600" />
                    <span className="text-xs font-bold text-pipe-900">{token.priceImpactPctAt1pct.toFixed(1)}%</span>
                  </div>
                )}

                {/* Watchers */}
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 bg-sky-50 border-sky-400"
                  title={`${token.watcherCount} watchers`}
                >
                  <Users className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-pipe-900">{token.watcherCount}</span>
                </div>

                {/* Hot Score */}
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 bg-mario-red-50 border-mario-red-400"
                  title={`Hot Score: ${token.hotScore}`}
                >
                  <TrendingUp className="w-4 h-4 text-mario-red-600" />
                  <span className="text-xs font-bold text-pipe-900">{Math.floor(token.hotScore)}</span>
                </div>
              </div>

              {/* Social Links Row */}
              {(token.twitter || token.telegram || token.website) && (
                <div className="flex items-center gap-2 mb-2">
                  {token.twitter && (
                    <a
                      href={token.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg border-2 border-sky-400 bg-sky-50 hover:bg-sky-100 transition-colors"
                      title="Twitter"
                    >
                      <Twitter className="w-3.5 h-3.5 text-sky-600" />
                    </a>
                  )}
                  {token.telegram && (
                    <a
                      href={token.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg border-2 border-sky-400 bg-sky-50 hover:bg-sky-100 transition-colors"
                      title="Telegram"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-sky-600" />
                    </a>
                  )}
                  {token.website && (
                    <a
                      href={token.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg border-2 border-sky-400 bg-sky-50 hover:bg-sky-100 transition-colors"
                      title="Website"
                    >
                      <Globe className="w-3.5 h-3.5 text-sky-600" />
                    </a>
                  )}
                </div>
              )}

              {/* Market Data Row */}
              {(token.marketCapUsd || token.volume24h || token.priceChange24h !== undefined) && (
                <div className="flex items-center gap-3 mb-2 text-xs">
                  {token.marketCapUsd && (
                    <div className="flex items-center gap-1" title={`Market Cap: $${formatCompact(token.marketCapUsd)}`}>
                      <DollarSign className="w-3.5 h-3.5 text-pipe-600" />
                      <span className="font-mono font-bold text-pipe-900">
                        MC: {formatCompact(token.marketCapUsd)}
                      </span>
                    </div>
                  )}
                  {token.volume24h && (
                    <div className="flex items-center gap-1" title={`24h Volume: $${formatCompact(token.volume24h)}`}>
                      <BarChart3 className="w-3.5 h-3.5 text-pipe-600" />
                      <span className="font-mono font-bold text-pipe-900">
                        Vol: {formatCompact(token.volume24h)}
                      </span>
                    </div>
                  )}
                  {token.priceChange24h !== undefined && (
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        token.priceChange24h > 0 ? "text-green-600" : "text-red-600"
                      )}
                      title={`24h Price Change: ${token.priceChange24h.toFixed(2)}%`}
                    >
                      {token.priceChange24h > 0 ? (
                        <ArrowUp className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5" />
                      )}
                      <span className="font-mono font-bold">
                        {Math.abs(token.priceChange24h).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Row: Contract Address + Progress Bar */}
              <div className="flex items-center gap-3">
                {/* Contract Address */}
                <button
                  onClick={handleCopyMint}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 border-pipe-300 bg-pipe-50 hover:bg-pipe-100 transition-colors"
                  title="Click to copy full address"
                >
                  <span className="font-mono text-xs text-pipe-700">{shortMint}</span>
                  {copied ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-pipe-500" />
                  )}
                </button>

                {/* Bonding Progress Bar */}
                {token.state === "bonded" && token.bondingCurveProgress !== undefined && (
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-3 bg-pipe-200 rounded-full overflow-hidden border-2 border-pipe-400">
                      <div
                        className="h-full bg-gradient-to-r from-coin-yellow-400 to-coin-yellow-600 transition-all duration-500"
                        style={{ width: `${Math.min(token.bondingCurveProgress, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-coin-yellow-700 min-w-[45px]">
                      {token.bondingCurveProgress.toFixed(1)}%
                    </span>
                  </div>
                )}

                {/* Pool Age for New Tokens */}
                {token.state === "new" && token.poolAgeMin !== undefined && (
                  <div className="px-2 py-1 rounded-lg border-2 border-luigi-green-400 bg-luigi-green-50">
                    <span className="text-xs font-bold text-luigi-green-700">
                      Pool: {token.poolAgeMin}m old
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Watch Button */}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleWatch(token.mint, token.isWatched || false)
              }}
              className={cn(
                "flex-shrink-0 p-3 rounded-full transition-all border-3",
                token.isWatched
                  ? "bg-mario-red-100 border-mario-red-500 hover:bg-mario-red-200"
                  : "bg-pipe-100 border-pipe-400 hover:bg-pipe-200"
              )}
            >
              <Heart
                className={cn(
                  "w-6 h-6",
                  token.isWatched ? "fill-mario-red-500 text-mario-red-500" : "text-pipe-500"
                )}
              />
            </button>
          </div>
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
    <div className="bg-gradient-to-r from-pipe-50 to-white rounded-xl border-3 border-pipe-300 shadow-mario p-4 animate-pulse">
      <div className="flex items-center gap-4">
        {/* Large logo skeleton */}
        <div className="w-16 h-16 rounded-full bg-pipe-200 border-3 border-pipe-300" />

        {/* Content skeleton */}
        <div className="flex-1">
          {/* Top row */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 bg-pipe-200 rounded w-24" />
            <div className="h-4 bg-pipe-100 rounded w-32" />
            <div className="h-3 bg-pipe-100 rounded w-12 ml-auto" />
          </div>

          {/* Metrics row */}
          <div className="flex items-center gap-3 mb-2">
            <div className="h-6 bg-pipe-100 rounded-lg w-16" />
            <div className="h-6 bg-pipe-100 rounded-lg w-16" />
            <div className="h-6 bg-pipe-100 rounded-lg w-16" />
            <div className="h-6 bg-pipe-100 rounded-lg w-16" />
            <div className="h-6 bg-pipe-100 rounded-lg w-16" />
          </div>

          {/* Bottom row */}
          <div className="flex items-center gap-3">
            <div className="h-6 bg-pipe-100 rounded-lg w-20" />
            <div className="flex-1 h-3 bg-pipe-200 rounded-full" />
          </div>
        </div>

        {/* Watch button skeleton */}
        <div className="w-12 h-12 rounded-full bg-pipe-200 border-3 border-pipe-300" />
      </div>
    </div>
  )
}
