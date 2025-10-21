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

  // Separate out props that might conflict with motion.div
  const { onClick, onMouseEnter, onMouseLeave, ...restProps } = props

  const renderContent = () => (
    <>
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
            <div className="text-muted-foreground">{icon}</div>
          )}
        </div>
      )}

      {value && (
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {value}
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trendColors[trend]
            )}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {change > 0 ? '+' : ''}{change}%
            </div>
          )}
        </div>
      )}

      {children}
    </>
  )

  if (animate) {
    return (
      <motion.div
        className={cn(variantClasses[variant], className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {renderContent()}
      </motion.div>
    )
  }

  return (
    <div
      className={cn(variantClasses[variant], className)}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...restProps}
    >
      {renderContent()}
    </div>
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