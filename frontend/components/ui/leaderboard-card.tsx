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
  onDrag,
  onDragStart,
  onDragEnd,
  onAnimationStart,
  ...props
}: LeaderboardRowProps) {
  const getRankBadge = () => {
    if (rank === 1) return (
      <div className="rank-badge rank-1 relative w-10 h-10 flex items-center justify-center">
        <img src="/icons/mario/1st.png" alt="1st place" className="w-10 h-10 drop-shadow-[3px_3px_0_var(--outline-black)]" />
      </div>
    )
    if (rank === 2) return (
      <div className="rank-badge rank-2 relative w-10 h-10 flex items-center justify-center">
        <img src="/icons/mario/2nd-place.png" alt="2nd place" className="w-10 h-10 drop-shadow-[3px_3px_0_var(--outline-black)]" />
      </div>
    )
    if (rank === 3) return (
      <div className="rank-badge rank-3 relative w-10 h-10 flex items-center justify-center">
        <img src="/icons/mario/3rd.png" alt="3rd place" className="w-10 h-10 drop-shadow-[3px_3px_0_var(--outline-black)]" />
      </div>
    )
    return <div className="rank-badge">{rank}</div>
  }

  const getChangeIcon = () => {
    if (change === 'up') return <TrendingUp className="h-4 w-4 text-profit" />
    if (change === 'down') return <TrendingDown className="h-4 w-4 text-loss" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const rowClassName = cn(
    'leaderboard-row',
    isCurrentUser && 'user-row',
    'flex items-center gap-4',
    className
  )

  const content = (
    <>
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
    </>
  )

  if (animate) {
    return (
      <motion.div
        className={rowClassName}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: rank * 0.05 }}
        whileHover={{ x: 4 }}
        {...props}
      >
        {content}
      </motion.div>
    )
  }

  return (
    <div
      className={rowClassName}
      onDrag={onDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onAnimationStart={onAnimationStart}
      {...props}
    >
      {content}
    </div>
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