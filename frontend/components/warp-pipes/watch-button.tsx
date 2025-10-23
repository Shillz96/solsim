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
  watcherCount: number
  onToggle: (mint: string, isWatched: boolean) => Promise<void>
  className?: string
  size?: "sm" | "md" | "lg"
}

export function WatchButton({
  mint,
  isWatched,
  watcherCount,
  onToggle,
  className,
  size = "md",
}: WatchButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isWatchedState, setIsWatchedState] = useState(isWatched)

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation if inside a Link
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

  const sizes = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          sizes[size],
          "border-3 rounded-[10px] transition-all duration-200 shadow-[2px_2px_0_rgba(0,0,0,0.2)]",
          isWatchedState
            ? "bg-mario-red-500 border-pipe-900 text-white hover:bg-mario-red-600 hover:-translate-y-[1px] hover:shadow-[3px_3px_0_rgba(0,0,0,0.3)]"
            : "bg-white border-pipe-400 text-pipe-700 hover:bg-sky-50 hover:-translate-y-[1px]",
          className
        )}
        title={isWatchedState ? "Remove from watchlist" : "Add to watchlist"}
      >
        <motion.div
          initial={false}
          animate={{
            scale: isWatchedState ? [1, 1.3, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <Heart
            className={cn(
              iconSizes[size],
              isWatchedState ? "fill-current" : ""
            )}
          />
        </motion.div>
      </Button>

      {/* Watcher Count */}
      {watcherCount > 0 && (
        <span className="text-xs font-mono font-bold text-pipe-700 bg-sky-50 px-2 py-0.5 rounded-[6px] border-2 border-pipe-300">
          {watcherCount}
        </span>
      )}
    </div>
  )
}

/**
 * Compact Watch Button - Just the icon, no count
 */
export function CompactWatchButton({
  mint,
  isWatched,
  onToggle,
  className,
}: Omit<WatchButtonProps, "watcherCount" | "size">) {
  const [isLoading, setIsLoading] = useState(false)
  const [isWatchedState, setIsWatchedState] = useState(isWatched)

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

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "p-2 rounded-[10px] border-3 transition-all duration-200 shadow-[2px_2px_0_rgba(0,0,0,0.2)]",
        isWatchedState
          ? "bg-mario-red-500 border-pipe-900 text-white hover:bg-mario-red-600 hover:-translate-y-[1px]"
          : "bg-white border-pipe-400 text-pipe-700 hover:bg-sky-50 hover:-translate-y-[1px]",
        className
      )}
      title={isWatchedState ? "Remove from watchlist" : "Add to watchlist"}
    >
      <motion.div
        initial={false}
        animate={{
          scale: isWatchedState ? [1, 1.2, 1] : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <Heart
          className={cn(
            "h-4 w-4",
            isWatchedState ? "fill-current" : ""
          )}
        />
      </motion.div>
    </button>
  )
}
