/**
 * Filter Bar Component - Mario-themed filter controls
 *
 * Provides search, sorting, and filtering options for the Warp Pipes feed
 */

"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, TrendingUp, Clock, Heart, SortAsc } from "lucide-react"
import { cn } from "@/lib/utils"

export type SortBy = "hot" | "new" | "watched" | "alphabetical"

interface FilterBarProps {
  searchQuery: string
  sortBy: SortBy
  onSearchChange: (query: string) => void
  onSortChange: (sort: SortBy) => void
  className?: string
}

export function FilterBar({
  searchQuery,
  sortBy,
  onSearchChange,
  onSortChange,
  className,
}: FilterBarProps) {
  const sortOptions: { value: SortBy; label: string; icon: React.ReactNode }[] = [
    { value: "hot", label: "🔥 Hot", icon: <TrendingUp className="h-4 w-4" /> },
    { value: "new", label: "⏰ New", icon: <Clock className="h-4 w-4" /> },
    { value: "watched", label: "❤️ Watched", icon: <Heart className="h-4 w-4" /> },
    { value: "alphabetical", label: "🔤 A-Z", icon: <SortAsc className="h-4 w-4" /> },
  ]

  return (
    <div className={cn("flex flex-col sm:flex-row gap-3 p-4 bg-[var(--card)] rounded-[16px] border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]", className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--outline-black)] opacity-70" />
        <Input
          type="text"
          placeholder="🔍 Search tokens..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 border-3 border-[var(--outline-black)] focus:border-[var(--mario-red)] rounded-[12px] font-semibold text-[var(--outline-black)] placeholder:text-[var(--outline-black)] placeholder:opacity-60"
        />
      </div>

      {/* Sort Buttons */}
      <div className="flex gap-2 flex-wrap">
        {sortOptions.map((option) => (
          <Button
            key={option.value}
            variant={sortBy === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange(option.value)}
            className={cn(
              "border-3 rounded-[12px] font-bold transition-all duration-200 shadow-[3px_3px_0_var(--outline-black)]",
              sortBy === option.value
                ? "bg-[var(--mario-red)] border-[var(--outline-black)] text-white hover:bg-[var(--mario-red)] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_var(--outline-black)]"
                : "bg-[var(--card)] border-[var(--outline-black)] text-[var(--outline-black)] hover:bg-[var(--background)] hover:-translate-y-[1px]"
            )}
          >
            <span>{option.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
