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
    <div className={cn("flex flex-col sm:flex-row gap-3 p-4 bg-card rounded-xl border-4 border-pipe-400 shadow-md", className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tokens..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 border-2 border-pipe-300 focus:border-mario-red-500 rounded-lg"
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
              "border-2 rounded-lg font-semibold transition-all duration-200",
              sortBy === option.value
                ? "bg-mario-red-500 border-mario-red-700 text-white hover:bg-mario-red-600 shadow-md"
                : "bg-white border-pipe-400 text-pipe-700 hover:bg-pipe-50"
            )}
          >
            <span className="mr-1.5">{option.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
