import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface LeaderboardRowProps extends React.HTMLAttributes<HTMLDivElement> {
  rank: number
  name: string
  value: string | number
  change?: 'up' | 'down' | 'same'
  isCurrentUser?: boolean
  avatar?: string | React.ReactNode
  subtitle?: string
  animate?: boolean
}

function LeaderboardRow({
  className,
  rank,
  name,
  value,
  change,
  isCurrentUser = false,
  avatar,
  subtitle,
  animate = true,
  ...props
}: LeaderboardRowProps) {
  const RowWrapper = animate ? motion.div : 'div'
  const animationProps = animate ? {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, delay: rank * 0.05 },
    whileHover: { x: 4 }
  } : {}

  const getRankBadge = () => {
    if (rank === 1) return (
      <div className="rank-badge rank-1">
        <Trophy className="h-4 w-4" />
      </div>
    )
    if (rank === 2) return <div className="rank-badge rank-2">2</div>
    if (rank === 3) return <div className="rank-badge rank-3">3</div>
    return <div className="rank-badge">{rank}</div>
  }

  const getChangeIcon = () => {
    if (change === 'up') return <TrendingUp className="h-4 w-4 text-profit" />
    if (change === 'down') return <TrendingDown className="h-4 w-4 text-loss" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <RowWrapper
      className={cn(
        'leaderboard-row',
        isCurrentUser && 'user-row',
        'flex items-center gap-4',
        className
      )}
      {...(animate ? animationProps : {})}
      {...props}
    >
      <div className="flex items-center gap-3">
        {getRankBadge()}
        {change && (
          <div className="w-5">{getChangeIcon()}</div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        {avatar && (
          <div className="flex-shrink-0">
            {typeof avatar === 'string' ? (
              <img
                src={avatar}
                alt={name}
                className="h-10 w-10 rounded-full border-2 border-border"
              />
            ) : (
              avatar
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{name}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="font-bold text-lg number-display">{value}</div>
      </div>
    </RowWrapper>
  )
}

interface LeaderboardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  children: React.ReactNode
}

function Leaderboard({
  className,
  title,
  children,
  ...props
}: LeaderboardProps) {
  return (
    <div
      className={cn(
        'space-y-3',
        className
      )}
      {...props}
    >
      {title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      {children}
    </div>
  )
}

export { LeaderboardRow, Leaderboard }