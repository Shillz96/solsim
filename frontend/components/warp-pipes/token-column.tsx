/**
 * Token Column Component - Container for token cards in each state
 *
 * Displays tokens in a vertical scrollable column with Mario-themed header
 */

"use client"

import { cn } from "@/lib/utils"
import { TokenCard, TokenCardSkeleton } from "./token-card"
import type { TokenRow } from "@/lib/types/warp-pipes"
import Image from "next/image"

interface TokenColumnProps {
  title: string
  tokens: TokenRow[]
  isLoading?: boolean
  onToggleWatch: (mint: string, isWatched: boolean) => Promise<void>
  className?: string
  headerColor?: "bonded" | "graduating" | "new"
}

export function TokenColumn({
  title,
  tokens,
  isLoading,
  onToggleWatch,
  className,
  headerColor = "bonded",
}: TokenColumnProps) {
  // Header colors based on column type
  const headerColors = {
    bonded: "bg-coin-yellow-500 text-pipe-900", // Coin Yellow
    graduating: "bg-star-yellow-500 text-pipe-900", // Star Yellow
    new: "bg-luigi-green-500 text-white", // Luigi Green
  }

  // Header images based on column type
  const headerImages = {
    bonded: "/bonded-10-23-2025.png",
    graduating: "/About-to-Graduate-10-23-2025.png",
    new: "/New-Pairs-10-23-2025.png",
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Column Header */}
      <div
        className={cn(
          "p-4 rounded-t-[16px] border-4 border-b-0 border-pipe-900 text-center",
          "flex items-center justify-center shadow-[4px_4px_0_rgba(0,0,0,0.2)]",
          headerColors[headerColor]
        )}
      >
        <Image
          src={headerImages[headerColor]}
          alt={title}
          width={400}
          height={80}
          className="h-16 w-auto object-contain drop-shadow-lg"
          priority
        />
      </div>

      {/* Column Body - Scrollable List */}
      <div
        className={cn(
          "flex-1 overflow-y-auto bg-sky-50 border-4 border-t-0 border-pipe-900 rounded-b-[16px]",
          "shadow-[6px_6px_0_rgba(0,0,0,0.3)] p-4 space-y-4"
        )}
      >
        {/* Loading State */}
        {isLoading && (
          <>
            <TokenCardSkeleton />
            <TokenCardSkeleton />
            <TokenCardSkeleton />
          </>
        )}

        {/* Empty State */}
        {!isLoading && tokens.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white rounded-[16px] border-3 border-pipe-300">
            <div className="text-6xl mb-4">🍄</div>
            <p className="text-pipe-900 font-bold text-[16px]">No tokens in this column</p>
            <p className="text-[14px] text-pipe-600 mt-2">Check back soon for new discoveries!</p>
          </div>
        )}

        {/* Token Cards - Vertical Stack */}
        {!isLoading && tokens.map((token) => (
          <TokenCard
            key={token.mint}
            data={token}
            onToggleWatch={onToggleWatch}
          />
        ))}
      </div>
    </div>
  )
}
