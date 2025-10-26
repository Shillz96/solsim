import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * MARIO LOADING COMPONENTS
 * Centralized loading indicators following Mario theme design system
 * - Uses Mario red spinner with star icon
 * - Proper borders (3-4px) and shadows
 * - Mario theme color variables
 */

interface MarioLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function MarioLoading({ message = "Loading...", size = 'md' }: MarioLoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`${sizeClasses[size]} border-4 border-outline border-t-[var(--star-yellow)] rounded-full animate-spin motion-reduce:animate-none`} />
      <p className="mt-4 text-outline font-mario">{message}</p>
    </div>
  )
}

interface MarioSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * MarioSpinner
 * Spinning Mario red border with star icon overlay
 * 
 * Sizes:
 * - sm: 32px (icon 16px)
 * - md: 48px (icon 24px) - default
 * - lg: 64px (icon 32px)
 */
export function MarioSpinner({ size = "md", className }: MarioSpinnerProps) {
  const dimensions = {
    sm: { outer: 32, inner: 16, border: 3 },
    md: { outer: 48, inner: 24, border: 4 },
    lg: { outer: 64, inner: 32, border: 4 },
  }
  
  const { outer, inner, border } = dimensions[size]
  
  return (
    <div className={cn("relative inline-block", className)} style={{ width: outer, height: outer }}>
      <div 
        className="rounded-full animate-spin motion-reduce:animate-none"
        style={{
          width: outer,
          height: outer,
          border: `${border}px solid var(--mario-red, #E52521)`,
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
        }}
      />
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ width: outer, height: outer }}
      >
        <Image 
          src="/icons/mario/star.png" 
          alt="Loading" 
          width={inner} 
          height={inner} 
          className="animate-pulse motion-reduce:animate-none" 
        />
      </div>
    </div>
  )
}

interface MarioLoadingCardProps {
  message?: string
  submessage?: string
  className?: string
}

/**
 * MarioLoadingCard
 * Card with Mario spinner and message
 * Uses proper Mario card styling (border, shadow, colors)
 */
export function MarioLoadingCard({ 
  message = "Loading...", 
  submessage,
  className 
}: MarioLoadingCardProps) {
  return (
    <div className={cn(
      "bg-card border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] rounded-xl p-8 flex flex-col items-center justify-center gap-4",
      className
    )}>
      <MarioSpinner size="lg" />
      <div className="text-center">
        <p className="font-bold text-[var(--pipe-900)] font-mario text-lg uppercase tracking-wide">
          {message}
        </p>
        {submessage && (
          <p className="text-sm text-[var(--pipe-700)] mt-2 font-semibold">
            {submessage}
          </p>
        )}
      </div>
    </div>
  )
}

interface MarioLoadingOverlayProps {
  message?: string
  submessage?: string
  show: boolean
}

/**
 * MarioLoadingOverlay
 * Full-screen loading with backdrop blur
 * Used for blocking operations
 */
export function MarioLoadingOverlay({ 
  message = "Loading...",
  submessage,
  show 
}: MarioLoadingOverlayProps) {
  if (!show) return null
  
  return (
    <div className="fixed inset-0 z-loading flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <MarioLoadingCard message={message} submessage={submessage} />
    </div>
  )
}

interface MarioInlineSpinnerProps {
  message?: string
  className?: string
}

/**
 * MarioInlineSpinner
 * Compact inline loading indicator
 * Good for button loading states
 */
export function MarioInlineSpinner({ message, className }: MarioInlineSpinnerProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <MarioSpinner size="sm" />
      {message && (
        <span className="text-sm font-semibold">{message}</span>
      )}
    </div>
  )
}

interface MarioLoadingBarProps {
  /**
   * Progress percentage (0-100)
   * If undefined, shows indeterminate animation
   */
  progress?: number
  className?: string
}

/**
 * MarioLoadingBar
 * Progress bar with Mario red fill
 * Can be determinate (with progress) or indeterminate (animated)
 */
export function MarioLoadingBar({ progress, className }: MarioLoadingBarProps) {
  const isIndeterminate = progress === undefined
  
  return (
    <div className={cn(
      "w-full h-3 bg-[var(--sky-200)] border-2 border-outline rounded-full overflow-hidden",
      className
    )}>
      <div 
        className={cn(
          "h-full bg-mario transition-all duration-300",
          isIndeterminate && "animate-[loading-bar_1.5s_ease-in-out_infinite] w-1/3"
        )}
        style={!isIndeterminate ? { width: `${Math.min(100, Math.max(0, progress))}%` } : undefined}
      />
    </div>
  )
}

interface MarioSkeletonPulseProps {
  className?: string
  children?: React.ReactNode
}

/**
 * MarioSkeletonPulse
 * Simple pulsing skeleton with Mario theme colors
 * Wrapper for quick skeleton implementations
 */
export function MarioSkeletonPulse({ className, children }: MarioSkeletonPulseProps) {
  return (
    <div className={cn(
      "bg-[var(--sky-200)] border-2 border-outline rounded-lg animate-pulse motion-reduce:animate-none",
      className
    )}>
      {children}
    </div>
  )
}
