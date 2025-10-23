/**
 * Token Card Component - Mario-themed token display card
 *
 * Displays token information with health capsule, watch button, and action buttons
 * Uses Mario theme with bold borders and vibrant colors
 */

"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, ExternalLink, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { HealthCapsule } from "./health-capsule"
import { WatchButton } from "./watch-button"
import type { TokenRow } from "@/lib/types/warp-pipes"

interface TokenCardProps {
  token: TokenRow
  onToggleWatch: (mint: string, isWatched: boolean) => Promise<void>
  rank?: number
  className?: string
}

export function TokenCard({ token, onToggleWatch, rank, className }: TokenCardProps) {
  // Determine card border color based on state
  const stateBorderColors = {
    bonded: "border-coin-yellow-500", // Coin Yellow for bonded (on curve)
    graduating: "border-star-yellow-500", // Star Yellow for graduating
    new: "border-luigi-green-500", // Luigi Green for new (AMM live)
  }

  // Determine state badge color
  const stateBadgeColors = {
    bonded: "bg-coin-yellow-500 text-black border-coin-yellow-700",
    graduating: "bg-star-yellow-500 text-black border-star-yellow-700",
    new: "bg-luigi-green-500 text-white border-luigi-green-700",
  }

  const stateLabels = {
    bonded: "🪙 Bonded",
    graduating: "⭐ Graduating",
    new: "🍄 New Pool",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-card rounded-xl border-4 shadow-md hover:shadow-lg",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5",
        "transform translate-z-0 will-change-transform",
        stateBorderColors[token.state],
        className
      )}
    >
      {/* Card Header */}
      <div className="p-4 border-b-2 border-border">
        <div className="flex items-start justify-between gap-3">
          {/* Token Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Token Logo */}
            {token.logoURI ? (
              <Image
                src={token.logoURI}
                alt={token.symbol || "Token"}
                width={48}
                height={48}
                className="rounded-full border-2 border-pipe-300 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-pipe-100 border-2 border-pipe-300 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🪙</span>
              </div>
            )}

            {/* Token Name/Symbol */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base truncate">{token.symbol || "UNKNOWN"}</h3>
                {rank && rank <= 3 && (
                  <Badge variant="outline" className="text-xs border-2 border-mario-red-500 bg-mario-red-50 text-mario-red-700 px-1.5 py-0">
                    #{rank}
                  </Badge>
                )}
                {token.hotScore >= 90 && (
                  <Flame className="h-4 w-4 text-mario-red-500" title="Hot Token!" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{token.name || "Unknown Token"}</p>
            </div>

            {/* Watch Button */}
            <WatchButton
              mint={token.mint}
              isWatched={token.isWatched || false}
              watcherCount={token.watcherCount}
              onToggle={onToggleWatch}
              size="sm"
            />
          </div>
        </div>

        {/* State Badge */}
        <div className="mt-3">
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold border-2 px-2 py-0.5",
              stateBadgeColors[token.state]
            )}
          >
            {stateLabels[token.state]}
          </Badge>
        </div>
      </div>

      {/* Card Body - Health Capsule */}
      <div className="p-4">
        <HealthCapsule token={token} className="mb-3" />

        {/* Hot Score Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Hot Score</span>
            <span className="text-xs font-mono font-bold text-foreground">{Math.round(token.hotScore)}</span>
          </div>
          <div className="h-2 bg-pipe-200 rounded-full overflow-hidden border border-pipe-300">
            <div
              className={cn(
                "h-full transition-all duration-300",
                token.hotScore >= 80 ? "bg-mario-red-500" : token.hotScore >= 50 ? "bg-star-yellow-500" : "bg-luigi-green-500"
              )}
              style={{ width: `${token.hotScore}%` }}
            />
          </div>
        </div>

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground font-mono">
          <div className="flex justify-between">
            <span>First seen:</span>
            <span>{new Date(token.firstSeenAt).toLocaleTimeString()}</span>
          </div>
          {token.stateChangedAt !== token.firstSeenAt && (
            <div className="flex justify-between mt-0.5">
              <span>State changed:</span>
              <span>{new Date(token.stateChangedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer - Actions */}
      <div className="p-4 pt-0 flex gap-2">
        {/* Enter Room Button */}
        <Link href={`/room/${token.mint}`} className="flex-1">
          <Button
            className="w-full bg-mario-red-500 text-white border-3 border-mario-red-700 hover:bg-mario-red-600 font-semibold rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:transform active:translate-y-0.5"
          >
            🚪 Enter Room
          </Button>
        </Link>

        {/* DexScreener Link */}
        <Button
          variant="outline"
          size="icon"
          className="border-2 border-pipe-400 hover:bg-pipe-50 rounded-lg"
          title="View on DexScreener"
          onClick={(e) => {
            e.preventDefault()
            window.open(`https://dexscreener.com/solana/${token.mint}`, "_blank")
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}

/**
 * Token Card Skeleton - Loading state
 */
export function TokenCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border-4 border-pipe-300 shadow-md p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-pipe-200" />
        <div className="flex-1">
          <div className="h-4 bg-pipe-200 rounded w-24 mb-2" />
          <div className="h-3 bg-pipe-100 rounded w-32" />
        </div>
      </div>
      <div className="h-6 bg-pipe-100 rounded mb-3" />
      <div className="h-2 bg-pipe-200 rounded mb-3" />
      <div className="h-10 bg-pipe-100 rounded" />
    </div>
  )
}
