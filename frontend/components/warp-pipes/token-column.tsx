/**
 * Token Column Component - Container for token cards in each state
 *
 * Displays tokens in a vertical scrollable column with Mario-themed header
 * Includes per-column filter panel functionality
 */

"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { TokenCard, TokenCardSkeleton } from "./token-card"
import { FilterPanel } from "./filter-panel"
import type { TokenRow, AdvancedFilters } from "@/lib/types/warp-pipes"
import { getDefaultFilters } from "@/lib/warp-pipes-filter-presets"
// Removed duplicate filter management - handled by parent component
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

  const handleFiltersChange = (newFilters: AdvancedFilters) => {
    onFiltersChange(newFilters)
  }

  const handleApplyFilters = () => {
    // Filters are already applied through onFiltersChange
    setFiltersOpen(false)
  }

  // Header colors based on column type
  const headerColors = {
    bonded: "bg-gradient-to-br from-[var(--coin-gold)] to-[var(--coin-yellow)] text-[var(--outline-black)]", // Gold/Yellow gradient
    graduating: "bg-gradient-to-br from-[var(--star-yellow)] to-amber-400 text-[var(--outline-black)]", // Bright Yellow gradient
    new: "bg-gradient-to-br from-[var(--luigi-green)] to-emerald-500 text-white", // Green gradient
  }

  // Body background colors based on column type
  const bodyColors = {
    bonded: "bg-gradient-to-b from-amber-50/30 to-white", // Subtle gold tint
    graduating: "bg-gradient-to-b from-yellow-50/30 to-white", // Subtle yellow tint
    new: "bg-gradient-to-b from-green-50/30 to-white", // Subtle green tint
  }

  // Header images based on column type
  const headerImages = {
    bonded: "/bonded-10-23-2025.png",
    graduating: "/About-to-Graduate-10-23-2025.png",
    new: "/New-Pairs-10-23-2025.png",
  }

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Token Column */}
      <div className={cn("flex flex-col h-full min-h-0 border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] overflow-hidden")}>
        {/* Column Header */}
        <div
          className={cn(
            "p-4 flex-shrink-0 text-center border-b-4 border-[var(--outline-black)]",
            "flex items-center justify-center",
            headerColors[headerColor]
          )}
        >
          <div className="relative">
            <Image
              src={headerImages[headerColor]}
              alt={title}
              width={400}
              height={80}
              className="h-16 w-auto object-contain drop-shadow-lg"
              priority
            />
            {/* Add black bar for NEW PAIRS to match other sections */}
            {headerColor === "new" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--outline-black)] rounded-sm"></div>
            )}
          </div>
        </div>

        {/* Filter Panel - Modal Trigger */}
        <div className={cn(
          "px-3 pt-3 pb-3 flex-shrink-0",
          bodyColors[headerColor]
        )}>
          <FilterPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            category={headerColor}
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
            onApply={handleApplyFilters}
            headerColor={headerColor}
          />
        </div>

        {/* Column Body - Scrollable List */}
        <div
          className={cn(
            "flex-1 overflow-y-auto p-3 pt-0 space-y-3 min-h-0",
            "scrollbar-none", // Hide scrollbars while maintaining scroll functionality
            bodyColors[headerColor]
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
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[var(--card)] rounded-[16px] border-3 border-[var(--outline-black)]">
            <div className="text-6xl mb-4">🍄</div>
            <p className="text-[var(--outline-black)] font-bold text-[16px]">No tokens in this column</p>
            <p className="text-[14px] text-[var(--outline-black)] opacity-70 mt-2">Check back soon for new discoveries!</p>
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
    </div>
  )
}
