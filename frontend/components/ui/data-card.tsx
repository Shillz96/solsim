import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface DataCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  value?: string | React.ReactNode
  change?: number
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'stat' | 'info' | 'tier'
  tierLevel?: 'bronze' | 'silver' | 'gold' | 'platinum'
  animate?: boolean
}

function DataCard({
  className,
  title,
  subtitle,
  value,
  change,
  icon,
  trend = 'neutral',
  variant = 'default',
  tierLevel,
  animate = true,
  children,
  ...props
}: DataCardProps) {
  const variantClasses = {
    default: 'data-card',
    stat: 'stat-card',
    info: 'info-card',
    tier: `tier-card ${tierLevel || ''}`
  }

  const trendClasses = {
    up: 'text-profit',
    down: 'text-loss',
    neutral: 'text-muted-foreground'
  }

  const CardWrapper = animate ? motion.div : 'div'
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  } : {}

  return (
    <CardWrapper
      className={cn(variantClasses[variant], className)}
      {...(animate ? animationProps : {})}
      {...props}
    >
      {(icon || title || subtitle) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {title && (
              <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="text-muted-foreground/50 ml-3">{icon}</div>
          )}
        </div>
      )}

      {value && (
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold tracking-tight number-display">
            {value}
          </div>
          {change !== undefined && (
            <span className={cn("text-sm font-medium", trendClasses[trend])}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>
      )}

      {children}
    </CardWrapper>
  )
}

interface DataCardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4
}

function DataCardGrid({
  className,
  columns = 3,
  children,
  ...props
}: DataCardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        gridCols[columns],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { DataCard, DataCardGrid }