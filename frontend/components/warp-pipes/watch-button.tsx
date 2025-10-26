/**
 * Watch Button Component - Mario-themed heart button
 *
 * Allows users to add/remove tokens from their watchlist
 * Shows filled heart when watched, outline when not watched
 */

"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface WatchButtonProps {
  mint: string
  isWatched: boolean
  watcherCount?: number
  onToggle: (mint: string, isWatched: boolean) => Promise<void>
  className?: string
  size?: "sm" | "md" | "lg"
  compact?: boolean
}

const SIZE_CONFIG = {
  sm: { container: "h-7 w-7", icon: "h-3 w-3" },
  md: { container: "h-8 w-8", icon: "h-4 w-4" },
  lg: { container: "h-10 w-10", icon: "h-5 w-5" },
}

function useWatchToggle(mint: string, initialWatched: boolean, onToggle: WatchButtonProps['onToggle']) {
  const [isLoading, setIsLoading] = useState(false)
  const [isWatchedState, setIsWatchedState] = useState(initialWatched)

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)
    try {
      await onToggle(mint, isWatchedState)
      setIsWatchedState(!isWatchedState)
    } catch (error) {
      console.error("Failed to toggle watch:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, isWatchedState, handleToggle }
}

export function WatchButton({
  mint,
  isWatched,
  watcherCount = 0,
  onToggle,
  className,
  size = "md",
  compact = false,
}: WatchButtonProps) {
  const { isLoading, isWatchedState, handleToggle } = useWatchToggle(mint, isWatched, onToggle)
  const sizeConfig = SIZE_CONFIG[size]

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "p-2 rounded-md border-3 transition-all duration-200 shadow-[2px_2px_0_var(--outline-black)]",
          isWatchedState
            ? "bg-mario border-outline text-white hover:bg-mario hover:-translate-y-[1px]"
            : "bg-card border-outline text-outline hover:bg-background hover:-translate-y-[1px]",
          className
        )}
        title={isWatchedState ? "Remove from watchlist" : "Add to watchlist"}
      >
        <motion.div
          initial={false}
          animate={{ scale: isWatchedState ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 0.2 }}
        >
          <Heart className={cn("h-4 w-4", isWatchedState ? "fill-current" : "")} />
        </motion.div>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          sizeConfig.container,
          "border-3 rounded-md transition-all duration-200 shadow-[2px_2px_0_var(--outline-black)]",
          isWatchedState
            ? "bg-mario border-outline text-white hover:bg-mario hover:-translate-y-[1px] hover:shadow-[3px_3px_0_var(--outline-black)]"
            : "bg-card border-outline text-outline hover:bg-background hover:-translate-y-[1px]",
          className
        )}
        title={isWatchedState ? "Remove from watchlist" : "Add to watchlist"}
      >
        <motion.div
          initial={false}
          animate={{ scale: isWatchedState ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          <Heart className={cn(sizeConfig.icon, isWatchedState ? "fill-current" : "")} />
        </motion.div>
      </Button>

      {watcherCount > 0 && (
        <span className="text-xs font-mono font-bold text-outline bg-background px-2 py-0.5 rounded-sm border-2 border-outline">
          {watcherCount}
        </span>
      )}
    </div>
  )
}

/**
 * Compact Watch Button - Deprecated: Use WatchButton with compact prop instead
 */
export function CompactWatchButton({
  mint,
  isWatched,
  onToggle,
  className,
}: Omit<WatchButtonProps, "watcherCount" | "size" | "compact">) {
  return (
    <WatchButton 
      mint={mint} 
      isWatched={isWatched} 
      onToggle={onToggle} 
      className={className} 
      compact 
    />
  )
}
