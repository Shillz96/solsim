/**
 * Token Card Component - Mario-themed compact token display card
 *
 * Compact card showing only essential information: logo, name, state badge, and action button
 * Uses Mario theme with bold borders and vibrant colors
 */

"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
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
    graduating: "⭐ About to Graduate",
    new: "🆕 New Pairs",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-card rounded-lg border-3 shadow-md hover:shadow-lg",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5",
        "transform translate-z-0 will-change-transform",
        stateBorderColors[token.state],
        className
      )}
    >
      {/* Compact Card Content */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {/* Token Logo */}
          {token.logoURI ? (
            <Image
              src={token.logoURI}
              alt={`${token.symbol || "Token"} logo`}
              width={40}
              height={40}
              className="rounded-full border-2 border-pipe-300 flex-shrink-0"
              unoptimized={true}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                // Show fallback div
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div 
            className={`w-10 h-10 rounded-full bg-pipe-100 border-2 border-pipe-300 flex items-center justify-center flex-shrink-0 ${token.logoURI ? 'hidden' : 'flex'}`}
          >
            <span className="text-sm">🪙</span>
          </div>

          {/* Token Name/Symbol */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm truncate">{token.symbol || "UNKNOWN"}</h3>
            <p className="text-xs text-muted-foreground truncate">{token.name || "Unknown Token"}</p>
          </div>
        </div>

        {/* State Badge */}
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-semibold border-2 px-2 py-0.5 mb-2 w-full justify-center",
            stateBadgeColors[token.state]
          )}
        >
          {stateLabels[token.state]}
        </Badge>

        {/* Enter Room Button */}
        <Link href={`/room/${token.mint}`} className="block">
          <Button
            className="w-full bg-mario-red-500 text-white border-2 border-mario-red-700 hover:bg-mario-red-600 font-semibold rounded-lg shadow-md transition-all duration-200 hover:shadow-lg active:transform active:translate-y-0.5 text-sm py-2"
          >
            🚪 Enter Room
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

/**
 * Token Card Skeleton - Loading state
 */
export function TokenCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border-3 border-pipe-300 shadow-md p-3 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-full bg-pipe-200" />
        <div className="flex-1">
          <div className="h-3 bg-pipe-200 rounded w-20 mb-1" />
          <div className="h-2 bg-pipe-100 rounded w-24" />
        </div>
      </div>
      <div className="h-5 bg-pipe-100 rounded mb-2" />
      <div className="h-8 bg-pipe-100 rounded" />
    </div>
  )
}
