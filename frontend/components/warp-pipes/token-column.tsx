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
import { saveFilters as saveToStorage, loadFilters as loadFromStorage } from "@/lib/warp-pipes-storage"
import Image from "next/image"

interface TokenColumnProps {
  title: string
  tokens: TokenRow[]
  isLoading?: boolean
  onToggleWatch: (mint: string, isWatched: boolean) => Promise<void>
  onFiltersChange?: (filters: AdvancedFilters) => void
  className?: string
  headerColor?: "bonded" | "graduating" | "new"
}

export function TokenColumn({
  title,
  tokens,
  isLoading,
  onToggleWatch,
  onFiltersChange,
  className,
  headerColor = "bonded",
}: TokenColumnProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<AdvancedFilters>({})

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = loadFromStorage(headerColor)
    if (savedFilters) {
      setFilters(savedFilters)
    } else {
      // Use default filters for this category
      const defaultFilters = getDefaultFilters(headerColor)
      setFilters(defaultFilters)
    }
  }, [headerColor])

  // Save filters to localStorage when they change
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      saveToStorage(headerColor, filters)
    }
  }, [filters, headerColor])

  // Notify parent component of filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters)
    }
  }, [filters, onFiltersChange])

  const handleFiltersChange = (newFilters: AdvancedFilters) => {
    setFilters(newFilters)
  }

  const handleApplyFilters = () => {
    // Trigger a refetch with new filters
    if (onFiltersChange) {
      onFiltersChange(filters)
    }
  }

  // Header colors based on column type
  const headerColors = {
    bonded: "bg-[var(--coin-yellow)] text-[var(--outline-black)]", // Coin Yellow
    graduating: "bg-[var(--star-yellow)] text-[var(--outline-black)]", // Star Yellow
    new: "bg-[var(--luigi-green)] text-white", // Luigi Green
  }

  // Header images based on column type
  const headerImages = {
    bonded: "/bonded-10-23-2025.png",
    graduating: "/About-to-Graduate-10-23-2025.png",
    new: "/New-Pairs-10-23-2025.png",
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Token Column */}
      <div className={cn("flex flex-col h-full border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] overflow-hidden")}>
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

        {/* Filter Panel - Inside Column */}
        <div className="px-3 pt-3 pb-3 flex-shrink-0 bg-white border-b-4 border-[var(--outline-black)]">
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
            "flex-1 overflow-y-auto bg-white p-4 space-y-4 min-h-0"
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
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white rounded-[16px] border-3 border-[var(--outline-black)]">
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
