import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Animation type
   * - pulse: Subtle pulsing animation (default)
   * - shimmer: Gradient shimmer effect
   * - none: No animation
   */
  animation?: "pulse" | "shimmer" | "none"
}

/**
 * Enhanced Skeleton Component
 * Provides loading placeholders with configurable animations
 * Respects prefers-reduced-motion for accessibility
 */
function Skeleton({ className, animation = "pulse", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        {
          "animate-pulse": animation === "pulse",
          "animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]":
            animation === "shimmer",
        },
        "motion-reduce:animate-none", // Respect reduced-motion preference
        className
      )}
      {...props}
    />
  )
}

/**
 * Chart Skeleton
 * Optimized skeleton for chart loading states
 */
function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-[300px] w-full" animation="shimmer" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  )
}

/**
 * Card Skeleton
 * Optimized skeleton for card loading states
 */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-6", className)}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

/**
 * Table Skeleton
 * Optimized skeleton for table/list loading states
 */
function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, ChartSkeleton, CardSkeleton, TableSkeleton }

