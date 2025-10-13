'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ReactNode, useState } from "react"

// Enhanced card variants with mobile optimization
interface EnhancedCardProps {
  /** Card content */
  children: ReactNode
  /** Card variant */
  variant?: 'default' | 'elevated' | 'bordered' | 'glass' | 'compact'
  /** Card size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Mobile-specific behavior */
  mobile?: {
    /** Stack direction on mobile */
    stackDirection?: 'vertical' | 'horizontal'
    /** Padding adjustment on mobile */
    padding?: 'tight' | 'normal' | 'loose'
    /** Hide on mobile */
    hidden?: boolean
  }
  /** Interactive states */
  interactive?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Additional CSS classes */
  className?: string
  /** Click handler */
  onClick?: () => void
}

// Enhanced grid system for responsive card layouts
interface CardGridProps {
  /** Grid children (cards) */
  children: ReactNode
  /** Column configuration */
  columns?: {
    /** Desktop columns (lg breakpoint and up) */
    desktop?: 1 | 2 | 3 | 4 | 5 | 6
    /** Tablet columns (md breakpoint) */
    tablet?: 1 | 2 | 3 | 4
    /** Mobile columns (sm breakpoint and below) */
    mobile?: 1 | 2
  }
  /** Gap between cards */
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  /** Auto-fit columns */
  autoFit?: boolean
  /** Minimum card width for auto-fit */
  minCardWidth?: string
  /** Additional CSS classes */
  className?: string
}

// Card section component for organizing content
interface CardSectionProps {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Section content */
  children: ReactNode
  /** Section spacing */
  spacing?: 'tight' | 'normal' | 'loose'
  /** Collapsible section */
  collapsible?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * EnhancedCard Component
 * 
 * Improved card component with mobile-first design and better visual hierarchy.
 * Features:
 * - Responsive design with mobile optimizations
 * - Multiple visual variants
 * - Interactive states and hover effects
 * - Improved accessibility
 */
export function EnhancedCard({
  children,
  variant = 'default',
  size = 'md',
  mobile,
  interactive = false,
  isLoading = false,
  className,
  onClick
}: EnhancedCardProps) {
  // Base card styles
  const baseStyles = cn(
    "transition-all duration-200 ease-in-out",
    "border border-border bg-card text-card-foreground shadow-sm",
    "rounded-lg overflow-hidden"
  )

  // Variant styles
  const variantStyles = {
    default: "",
    elevated: "shadow-md hover:shadow-lg",
    bordered: "border-2 border-border hover:border-primary/50",
    glass: "backdrop-blur-sm bg-card/95 border-border/50",
    compact: "shadow-none border-border/50"
  }

  // Size styles
  const sizeStyles = {
    sm: "text-sm",
    md: "",
    lg: "text-lg",
    xl: "text-xl"
  }

  // Interactive styles
  const interactiveStyles = interactive ? cn(
    "cursor-pointer select-none",
    "hover:shadow-md hover:scale-[1.02]",
    "active:scale-[0.98] active:shadow-sm",
    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
  ) : ""

  // Mobile styles
  const mobileStyles = mobile ? cn(
    // Stack direction
    mobile.stackDirection === 'horizontal' && "sm:flex sm:flex-row sm:items-center",
    // Padding adjustments
    mobile.padding === 'tight' && "sm:p-2",
    mobile.padding === 'loose' && "sm:p-6",
    // Hide on mobile
    mobile.hidden && "hidden sm:block"
  ) : ""

  // Loading styles
  const loadingStyles = isLoading ? "animate-pulse opacity-75" : ""

  // Combined styles
  const cardStyles = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    interactiveStyles,
    mobileStyles,
    loadingStyles,
    className
  )

  // Wrapper props for interactive cards
  const wrapperProps = interactive ? {
    role: 'button',
    tabIndex: 0,
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.()
      }
    },
    'aria-label': 'Interactive card'
  } : { onClick }

  return (
    <Card className={cardStyles} {...wrapperProps}>
      {children}
    </Card>
  )
}

/**
 * CardGrid Component
 * 
 * Responsive grid system optimized for card layouts.
 * Features:
 * - Responsive column configuration
 * - Auto-fit columns with minimum width
 * - Mobile-first spacing
 * - CSS Grid with fallback support
 */
export function CardGrid({
  children,
  columns = { desktop: 3, tablet: 2, mobile: 1 },
  gap = 'md',
  autoFit = false,
  minCardWidth = '300px',
  className
}: CardGridProps) {
  // Gap styles
  const gapStyles = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  }

  // Auto-fit grid styles
  const autoFitStyles = autoFit 
    ? `grid-cols-[repeat(auto-fit,minmax(${minCardWidth},1fr))]`
    : cn(
        `grid-cols-${columns.mobile || 1}`,
        `md:grid-cols-${columns.tablet || 2}`,
        `lg:grid-cols-${columns.desktop || 3}`
      )

  return (
    <div className={cn(
      "grid",
      autoFitStyles,
      gapStyles[gap],
      className
    )}>
      {children}
    </div>
  )
}

/**
 * CardSection Component
 * 
 * Organizes card content into logical sections with consistent spacing.
 */
export function CardSection({
  title,
  description,
  children,
  spacing = 'normal',
  collapsible = false,
  defaultCollapsed = false,
  className
}: CardSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  // Spacing styles
  const spacingStyles = {
    tight: 'space-y-2',
    normal: 'space-y-4',
    loose: 'space-y-6'
  }

  return (
    <div className={cn(spacingStyles[spacing], className)}>
      {/* Section Header */}
      {(title || description) && (
        <div className={cn(
          "space-y-1",
          collapsible && "cursor-pointer select-none"
        )} onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}>
          {title && (
            <h3 className={cn(
              "font-semibold leading-none tracking-tight",
              collapsible && "flex items-center justify-between"
            )}>
              {title}
              {collapsible && (
                <svg
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isCollapsed && "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Section Content */}
      {(!collapsible || !isCollapsed) && (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

// Mobile-optimized card layouts
export const MobileCardLayouts = {
  /**
   * List layout - optimized for mobile viewing
   */
  List: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("space-y-2 sm:space-y-3", className)}>
      {children}
    </div>
  ),

  /**
   * Masonry layout - Pinterest-style responsive grid
   */
  Masonry: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn(
      "columns-1 sm:columns-2 lg:columns-3 xl:columns-4",
      "gap-4 space-y-4",
      className
    )}>
      {children}
    </div>
  ),

  /**
   * Horizontal scroll layout - for mobile carousels
   */
  HorizontalScroll: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn(
      "flex gap-4 overflow-x-auto pb-4",
      "snap-x snap-mandatory",
      "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20",
      className
    )}>
      {children}
    </div>
  )
}

// Export types
export type { EnhancedCardProps, CardGridProps, CardSectionProps }