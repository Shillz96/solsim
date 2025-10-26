/**
 * Token Column Component - Container for token cards in each state
 *
 * Displays tokens in a vertical scrollable column with Mario-themed header
 * Includes per-column filter panel functionality
 */

"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { TokenCard, TokenCardSkeleton } from "./token-card"
import { FilterPanel } from "./filter-panel"
import type { TokenRow, AdvancedFilters } from "@/lib/types/warp-pipes"
import Image from "next/image"

interface TokenColumnProps {
  title: string
  tokens: TokenRow[]
  isLoading?: boolean
  onToggleWatch: (mint: string, isWatched: boolean) => Promise<void>
  filters: AdvancedFilters
  onFiltersChange: (filters: AdvancedFilters) => void
  className?: string
  headerColor?: "bonded" | "graduating" | "new"
}

export function TokenColumn({
  title,
  tokens,
  isLoading,
  onToggleWatch,
  filters,
  onFiltersChange,
  className,
  headerColor = "bonded",
}: TokenColumnProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Consolidated theme configuration
  const theme = {
    bonded: {
      header: "text-outline",
      headerBg: "bg-coin",
      body: "bg-gradient-to-b from-amber-100/40 to-amber-50/20",
      image: "/bonded-10-23-2025.png",
    },
    graduating: {
      header: "text-outline",
      headerBg: "bg-star",
      body: "bg-gradient-to-b from-yellow-100/40 to-yellow-50/20",
      image: "/About-to-Graduate-10-23-2025.png",
    },
    new: {
      header: "text-white",
      headerBg: "bg-luigi",
      body: "bg-gradient-to-b from-green-100/40 to-green-50/20",
      image: "/New-Pairs-10-23-2025.png",
    },
  }[headerColor]

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Token Column */}
      <div className={cn("flex flex-col h-full min-h-0 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] overflow-hidden")}>
        {/* Column Header */}
        <div
          className={cn(
            "p-4 flex-shrink-0 text-center border-b-4 border-outline",
            "flex items-center justify-center",
            theme.header,
            theme.headerBg
          )}
        >
          <div className="relative">
            <Image
              src={theme.image}
              alt={title}
              width={400}
              height={80}
              className="h-16 w-auto object-contain drop-shadow-lg"
              priority
            />
          </div>
        </div>

        {/* Filter Panel - Modal Trigger */}
        <div className={cn("px-3 pt-3 pb-3 flex-shrink-0", theme.body)}>
          <FilterPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
            category={headerColor}
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
            onApply={() => setFiltersOpen(false)}
            headerColor={headerColor}
          />
        </div>

        {/* Column Body - Scrollable List */}
        <div
          className={cn(
            "flex-1 overflow-y-auto p-3 pt-0 space-y-3 min-h-0",
            "scrollbar-none",
            theme.body
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
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-card rounded-xl border-3 border-outline">
            <div className="text-6xl mb-4">🍄</div>
            <p className="text-outline font-bold text-[16px]">No tokens in this column</p>
            <p className="text-[14px] text-outline opacity-70 mt-2">Check back soon for new discoveries!</p>
          </div>
        )}

        {/* Token Cards - Vertical Stack */}
        {!isLoading && tokens.map((token, index) => {
          // Enable live updates for:
          // 1. Graduating tokens (ABOUT_TO_BOND status)
          // 2. Top 10 tokens in each column
          const shouldEnableLive = 
            token.status === 'ABOUT_TO_BOND' || 
            index < 10;

          return (
            <TokenCard
              key={token.mint}
              data={token}
              onToggleWatch={onToggleWatch}
              enableLiveUpdates={shouldEnableLive}
            />
          );
        })}
        </div>
      </div>
    </div>
  )
}
