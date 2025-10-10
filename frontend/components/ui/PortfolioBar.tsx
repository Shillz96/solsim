"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface PortfolioBarProps {
  /** Current portfolio value */
  value: number
  /** Maximum value for the bar */
  max: number
  /** Optional label */
  label?: string
  /** Additional CSS classes */
  className?: string
  /** Show percentage */
  showPercentage?: boolean
  /** Color variant */
  variant?: "default" | "success" | "warning" | "destructive"
}

/**
 * PortfolioBar - A progress bar for portfolio metrics
 * 
 * Displays portfolio values as a visual progress indicator
 * Useful for showing allocation percentages, performance metrics, etc.
 */
export function PortfolioBar({
  value,
  max,
  label,
  className,
  showPercentage = false,
  variant = "default"
}: PortfolioBarProps) {
  const percentage = Math.min((value / max) * 100, 100)
  
  const getVariantColor = (variant: string) => {
    switch (variant) {
      case "success":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "destructive":
        return "bg-red-500"
      default:
        return "bg-primary"
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="font-medium">{percentage.toFixed(1)}%</span>
          )}
        </div>
      )}
      <Progress 
        value={percentage} 
        className={cn("h-2", getVariantColor(variant))}
      />
    </div>
  )
}
