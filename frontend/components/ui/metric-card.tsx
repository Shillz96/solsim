'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FinancialValue, ProfitLossValue } from "@/components/ui/financial-value"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react"

interface MetricCardProps {
  /** Card title */
  title: string
  /** Primary value to display */
  value: number
  /** Optional change value for comparison */
  change?: number
  /** Change period (e.g., "24h", "7d") */
  changePeriod?: string
  /** Card icon */
  icon?: LucideIcon
  /** Card variant */
  variant?: 'default' | 'compact' | 'detailed'
  /** Whether to show SOL equivalent */
  showSolEquivalent?: boolean
  /** Precision level for values */
  precision?: 'low' | 'medium' | 'high' | 'crypto'
  /** Additional description */
  description?: string
  /** Loading state */
  isLoading?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * MetricCard Component
 * 
 * Standardized component for displaying financial metrics with:
 * - Consistent layout and spacing
 * - Automatic profit/loss colorization for changes
 * - Optional trend indicators
 * - Loading states
 * - SOL equivalent displays
 * 
 * @example
 * ```tsx
 * <MetricCard
 *   title="Portfolio Value"
 *   value={12345.67}
 *   change={234.56}
 *   changePeriod="24h"
 *   icon={Wallet}
 *   variant="detailed"
 * />
 * ```
 */
export function MetricCard({
  title,
  value,
  change,
  changePeriod,
  icon: Icon,
  variant = 'default',
  showSolEquivalent = true,
  precision = 'medium',
  description,
  isLoading = false,
  className
}: MetricCardProps) {
  
  const hasChange = change !== undefined && change !== 0
  const isPositiveChange = change && change > 0
  
  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className={cn(
          "pb-3",
          variant === 'compact' && "pb-2"
        )}>
          <div className="flex items-center justify-between">
            <div className="h-4 bg-muted rounded w-24"></div>
            {hasChange && (
              <div className="h-6 bg-muted rounded w-16"></div>
            )}
          </div>
        </CardHeader>
        <CardContent className={cn(
          "pt-0",
          variant === 'compact' && "py-2"
        )}>
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-32"></div>
            {showSolEquivalent && (
              <div className="h-4 bg-muted rounded w-24"></div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200",
      hasChange && "border-l-4",
      hasChange && isPositiveChange && "border-l-profit hover:border-l-profit/80",
      hasChange && !isPositiveChange && "border-l-loss hover:border-l-loss/80",
      className
    )}>
      {/* Background gradient overlay */}
      {hasChange && (
        <div className={cn(
          "absolute inset-0 opacity-5",
          isPositiveChange && "bg-gradient-to-br from-profit to-transparent",
          !isPositiveChange && "bg-gradient-to-br from-loss to-transparent"
        )} />
      )}
      
      <CardHeader className={cn(
        "relative z-10 pb-3",
        variant === 'compact' && "pb-2"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={cn(
                "p-2 rounded-lg transition-colors",
                hasChange && isPositiveChange && "bg-profit/10 text-profit",
                hasChange && !isPositiveChange && "bg-loss/10 text-loss",
                !hasChange && "bg-primary/10 text-primary"
              )}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <CardTitle className={cn(
              "text-sm font-semibold uppercase tracking-wide text-muted-foreground",
              variant === 'compact' && "text-xs"
            )}>
              {title}
            </CardTitle>
          </div>
          
          {hasChange && (
            <div className="flex items-center gap-1">
              <Badge 
                variant="outline"
                className={cn(
                  "text-xs font-medium",
                  isPositiveChange && "border-profit/20 bg-profit/10 text-profit",
                  !isPositiveChange && "border-loss/20 bg-loss/10 text-loss"
                )}
              >
                <div className="flex items-center gap-1">
                  {isPositiveChange ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {changePeriod && <span>{changePeriod}</span>}
                </div>
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn(
        "relative z-10 pt-0",
        variant === 'compact' && "py-2"
      )}>
        <div className="space-y-2">
          {/* Main value */}
          <FinancialValue
            usd={value}
            precision={precision}
            showSolEquivalent={showSolEquivalent}
            size={variant === 'compact' ? 'md' : 'lg'}
            emphasis="bold"
            colorize={hasChange ? (isPositiveChange ? 'profit' : 'loss') : 'none'}
          />
          
          {/* Change value */}
          {hasChange && (
            <ProfitLossValue
              usd={change!}
              precision={precision}
              showSolEquivalent={false}
              size="sm"
              inline={true}
              className="flex items-center gap-1"
            />
          )}
          
          {/* Description */}
          {description && variant !== 'compact' && (
            <p className="text-xs text-muted-foreground mt-2">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Specialized variants for common metrics
 */

export function PortfolioMetricCard(props: Omit<MetricCardProps, 'precision' | 'variant'>) {
  return (
    <MetricCard 
      {...props} 
      precision="medium"
      variant="detailed"
    />
  )
}

export function TradingMetricCard(props: Omit<MetricCardProps, 'precision'>) {
  return (
    <MetricCard 
      {...props} 
      precision="high"
    />
  )
}

export function CompactMetricCard(props: Omit<MetricCardProps, 'variant'>) {
  return (
    <MetricCard 
      {...props} 
      variant="compact"
    />
  )
}