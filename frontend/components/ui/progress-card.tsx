import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ProgressCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  current: number
  max: number
  unit?: string
  icon?: React.ReactNode
  variant?: 'default' | 'reward' | 'achievement'
  color?: 'primary' | 'success' | 'warning' | 'danger'
  showPercentage?: boolean
  animate?: boolean
}

function ProgressCard({
  className,
  title,
  current,
  max,
  unit = '',
  icon,
  variant = 'default',
  color = 'primary',
  showPercentage = true,
  animate = true,
  ...props
}: ProgressCardProps) {
  const percentage = Math.min((current / max) * 100, 100)

  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-profit',
    warning: 'bg-yellow-500',
    danger: 'bg-loss'
  }

  const CardWrapper = animate ? motion.div : 'div'
  const animationProps = animate ? {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 }
  } : {}

  return (
    <CardWrapper
      className={cn(
        'stat-card',
        className
      )}
      {...(animate ? animationProps : {})}
      {...props}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">{title}</h4>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold number-display">{current.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/ {max.toLocaleString()} {unit}</span>
          </div>
        </div>
        {icon && (
          <div className="text-muted-foreground/50">{icon}</div>
        )}
      </div>

      <div className="space-y-2">
        <div className="progress-bar">
          {animate ? (
            <motion.div
              className={cn('progress-bar-fill', colorClasses[color])}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          ) : (
            <div
              className={cn('progress-bar-fill', colorClasses[color])}
              style={{ width: `${percentage}%` }}
            />
          )}
        </div>
        {showPercentage && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(percentage)}% Complete</span>
            <span>{max - current} {unit} remaining</span>
          </div>
        )}
      </div>
    </CardWrapper>
  )
}

interface AchievementBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  icon?: React.ReactNode
  earned?: boolean
  progress?: number
  maxProgress?: number
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
}

function AchievementBadge({
  className,
  title,
  description,
  icon,
  earned = false,
  progress,
  maxProgress,
  rarity = 'common',
  ...props
}: AchievementBadgeProps) {
  const rarityColors = {
    common: 'border-gray-400',
    rare: 'border-blue-500',
    epic: 'border-purple-500',
    legendary: 'border-yellow-500'
  }

  const rarityBg = {
    common: 'bg-gray-400/10',
    rare: 'bg-blue-500/10',
    epic: 'bg-purple-500/10',
    legendary: 'bg-yellow-500/10'
  }

  return (
    <motion.div
      className={cn(
        'relative p-4 rounded-lg border-2 transition-all',
        earned ? rarityColors[rarity] : 'border-border opacity-60',
        earned && rarityBg[rarity],
        className
      )}
      whileHover={{ scale: earned ? 1.05 : 1 }}
      whileTap={{ scale: earned ? 0.95 : 1 }}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className={cn(
            'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
            earned ? 'bg-primary/20' : 'bg-muted'
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{title}</h4>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          {progress !== undefined && maxProgress !== undefined && !earned && (
            <div className="mt-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress / maxProgress) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {progress} / {maxProgress}
              </p>
            </div>
          )}
        </div>
      </div>
      {earned && (
        <motion.div
          className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          Earned!
        </motion.div>
      )}
    </motion.div>
  )
}

export { ProgressCard, AchievementBadge }