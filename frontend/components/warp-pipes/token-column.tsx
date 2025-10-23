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
    bonded: "bg-coin-yellow-500 border-coin-yellow-700 text-black", // Coin Yellow
    graduating: "bg-star-yellow-500 border-star-yellow-700 text-black", // Star Yellow
    new: "bg-luigi-green-500 border-luigi-green-700 text-white", // Luigi Green
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
          "p-3 rounded-t-lg border-3 border-b-0 text-center",
          "shadow-md flex items-center justify-center",
          headerColors[headerColor]
        )}
      >
        <Image
          src={headerImages[headerColor]}
          alt={title}
          width={400}
          height={80}
          className="h-16 w-auto object-contain"
          priority
        />
      </div>

      {/* Column Body - Scrollable */}
      <div
        className={cn(
          "flex-1 overflow-y-auto bg-sky-50 border-3 border-t-0 rounded-b-lg",
          "shadow-md p-2 space-y-2",
          headerColor === "bonded" && "border-coin-yellow-700",
          headerColor === "graduating" && "border-star-yellow-700",
          headerColor === "new" && "border-luigi-green-700"
        )}
        style={{
          maxHeight: "calc(100vh - 200px)", // Adjust based on header height
          minHeight: "400px",
        }}
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
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-6xl mb-4">🍄</div>
            <p className="text-muted-foreground font-medium">No tokens in this column</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon for new discoveries!</p>
          </div>
        )}

        {/* Token Cards */}
        {!isLoading &&
          tokens.map((token, index) => (
            <TokenCard
              key={token.mint}
              token={token}
              onToggleWatch={onToggleWatch}
              rank={index + 1}
            />
          ))}
      </div>
    </div>
  )
}
