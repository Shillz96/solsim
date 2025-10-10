"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface NavSearchProps {
  /** Search query value */
  value: string
  /** Callback when value changes */
  onValueChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
  /** Loading state */
  isLoading?: boolean
  /** Callback when search is cleared */
  onClear?: () => void
  /** Callback when Enter is pressed */
  onSearch?: (query: string) => void
}

/**
 * NavSearch - Search input component for navigation
 * 
 * Optimized search input with clear functionality
 * Designed for use in navigation bars and headers
 */
export function NavSearch({
  value,
  onValueChange,
  placeholder = "Search...",
  className,
  isLoading = false,
  onClear,
  onSearch
}: NavSearchProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearch) {
      onSearch(value)
    }
  }

  const handleClear = () => {
    onValueChange("")
    onClear?.()
  }

  return (
    <div className={cn("relative flex-1 max-w-md", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-9 pr-9"
        disabled={isLoading}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-transparent"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  )
}
