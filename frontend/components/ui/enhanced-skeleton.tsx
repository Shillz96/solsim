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

/**
 * ============================================
 * MARIO-THEMED SKELETON COMPONENTS
 * ============================================
 */

/**
 * MarioCardSkeleton
 * Card skeleton with Mario borders and shadows
 */
function MarioCardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn(
      "bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6 space-y-3",
      className
    )}>
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="h-6 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none"
        />
      ))}
    </div>
  )
}

/**
 * MarioTableRowSkeleton
 * Table row skeleton with proper Mario spacing
 */
function MarioTableRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-3 bg-[var(--card)] border-2 border-[var(--outline-black)] rounded-lg",
      className
    )}>
      <div className="h-10 w-10 bg-[var(--sky-200)] rounded-full animate-pulse motion-reduce:animate-none" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[var(--sky-200)] rounded w-3/4 animate-pulse motion-reduce:animate-none" />
        <div className="h-3 bg-[var(--sky-200)] rounded w-1/2 animate-pulse motion-reduce:animate-none" />
      </div>
      <div className="h-6 w-20 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
    </div>
  )
}

/**
 * MarioStatSkeleton
 * Stat card skeleton (label + value + optional icon)
 */
function MarioStatSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-[var(--card)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg p-4",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 w-24 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
        <div className="h-5 w-5 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
      </div>
      <div className="h-8 w-32 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
    </div>
  )
}

/**
 * MarioTokenCardSkeleton
 * Token display card skeleton with image + metadata
 */
function MarioTokenCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-[var(--card)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-xl p-4",
      className
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-12 w-12 bg-[var(--sky-200)] rounded-full animate-pulse motion-reduce:animate-none" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-[var(--sky-200)] rounded w-32 animate-pulse motion-reduce:animate-none" />
          <div className="h-4 bg-[var(--sky-200)] rounded w-20 animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-4 bg-[var(--sky-200)] rounded w-16 animate-pulse motion-reduce:animate-none" />
          <div className="h-4 bg-[var(--sky-200)] rounded w-24 animate-pulse motion-reduce:animate-none" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-[var(--sky-200)] rounded w-20 animate-pulse motion-reduce:animate-none" />
          <div className="h-4 bg-[var(--sky-200)] rounded w-20 animate-pulse motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  )
}

/**
 * MarioChartSkeleton
 * Chart skeleton with Mario theme
 */
function MarioChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
        <div className="h-8 w-24 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
      </div>
      <div className="h-[300px] bg-[var(--sky-200)] rounded-lg animate-pulse motion-reduce:animate-none" />
      <div className="flex gap-2 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 w-16 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  )
}

/**
 * MarioTableSkeleton
 * Full table skeleton with Mario theme
 */
function MarioTableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn(
      "bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="flex gap-4 p-4 bg-[var(--sky-100)] border-b-3 border-[var(--outline-black)]">
        <div className="h-4 w-32 bg-[var(--sky-300)] rounded animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-24 bg-[var(--sky-300)] rounded animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-24 bg-[var(--sky-300)] rounded animate-pulse motion-reduce:animate-none" />
        <div className="h-4 w-20 bg-[var(--sky-300)] rounded animate-pulse motion-reduce:animate-none" />
      </div>
      {/* Rows */}
      <div className="divide-y-2 divide-[var(--outline-black)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <div className="h-10 w-32 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
            <div className="h-10 w-24 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
            <div className="h-10 w-24 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
            <div className="h-10 w-20 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  ChartSkeleton, 
  CardSkeleton, 
  TableSkeleton,
  // Mario-themed skeletons
  MarioCardSkeleton,
  MarioTableRowSkeleton,
  MarioStatSkeleton,
  MarioTokenCardSkeleton,
  MarioChartSkeleton,
  MarioTableSkeleton,
}

