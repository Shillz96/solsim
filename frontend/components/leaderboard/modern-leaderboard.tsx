"use client"

import type React from "react"
import { useState } from "react"
import { LeaderboardRow, Leaderboard } from "@/components/ui/leaderboard-card"
import { DataCard, DataCardGrid } from "@/components/ui/data-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, TrendingUp, Target, Users, LayoutGrid, List, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type * as Backend from "@/lib/types/backend"
import { formatUSD } from "@/lib/format"
import { motion, AnimatePresence } from "framer-motion"

interface ModernLeaderboardProps {
  timeRange: "24h" | "7d" | "all"
  currentUserId?: string
  userRowRef?: React.RefObject<HTMLElement | null>
  loading?: boolean
  data?: Backend.LeaderboardEntry[]
  userStats?: {
    rank: number
    totalPnl: number
    trades: number
    winRate: number
    balance: number
  }
}

export function ModernLeaderboard({
  timeRange,
  currentUserId,
  userRowRef,
  loading = false,
  data: externalData = [],
  userStats
}: ModernLeaderboardProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')

  // Get change trend based on previous rank (mock data for demo)
  const getChangeTrend = (rank: number): 'up' | 'down' | 'same' => {
    // This would normally compare with previous rank
    const random = Math.random()
    if (random > 0.66) return 'up'
    if (random > 0.33) return 'down'
    return 'same'
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (!externalData || externalData.length === 0) {
    return (
      <div className="stat-card">
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No leaderboard data available</p>
          <p className="text-sm text-muted-foreground mt-2">Start trading to appear on the leaderboard!</p>
        </div>
      </div>
    )
  }

  // Get top 3 for special display
  const top3 = externalData.slice(0, 3)
  const rest = externalData.slice(3)

  return (
    <div className="space-y-6">
      {/* User Stats Overview */}
      {userStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <DataCardGrid columns={4}>
            <DataCard
              variant="stat"
              title="Your Rank"
              value={`#${userStats.rank}`}
              icon={<Trophy className="h-5 w-5" />}
              change={userStats.rank <= 10 ? 5 : -2}
              trend={userStats.rank <= 10 ? "up" : "down"}
            />
            <DataCard
              variant="stat"
              title="Total PnL"
              value={formatUSD(userStats.totalPnl)}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={userStats.totalPnl > 0 ? "up" : "down"}
            />
            <DataCard
              variant="stat"
              title="Win Rate"
              value={`${userStats.winRate.toFixed(1)}%`}
              icon={<Target className="h-5 w-5" />}
              trend={userStats.winRate > 50 ? "up" : "down"}
            />
            <DataCard
              variant="stat"
              title="Total Trades"
              value={userStats.trades.toString()}
              icon={<Users className="h-5 w-5" />}
            />
          </DataCardGrid>
        </motion.div>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Top Performers</h2>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="btn-enhanced"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="btn-enhanced"
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>
      </div>

      {/* Top 3 Special Display - Enhanced with 2025 Glassmorphism & Neumorphism hybrid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((entry, index) => (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, scale: 0.9, rotateY: -30 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{
              delay: index * 0.1,
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
            whileHover={{
              scale: 1.05,
              rotateY: 5,
              transition: { duration: 0.3 }
            }}
          >
            <div className={cn(
              "relative overflow-hidden rounded-2xl p-6 transition-all duration-500",
              "backdrop-blur-xl bg-gradient-to-br shadow-2xl",
              index === 0 && "from-yellow-500/20 via-amber-500/10 to-orange-500/5 border border-yellow-500/50",
              index === 1 && "from-pipe-400/20 via-pipe-500/10 to-pipe-600/5 border border-pipe-400/50",
              index === 2 && "from-orange-600/20 via-amber-600/10 to-red-500/5 border border-orange-600/50",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent",
              "hover:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)]",
              "group"
            )}>
              {/* Animated Rank Badge with Pulse Effect */}
              <motion.div
                className="absolute top-2 right-2"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              >
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl",
                  "shadow-lg relative overflow-hidden",
                  index === 0 && "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-black",
                  index === 1 && "bg-gradient-to-br from-pipe-200 via-pipe-300 to-pipe-400 text-black",
                  index === 2 && "bg-gradient-to-br from-orange-300 via-orange-400 to-red-500 text-white",
                  "before:absolute before:inset-0 before:bg-gradient-to-t before:from-white/0 before:via-white/30 before:to-white/0",
                  "before:translate-y-full before:group-hover:translate-y-[-100%] before:transition-transform before:duration-700"
                )}>
                  <span className="relative z-10">{index + 1}</span>
                </div>
              </motion.div>

              {/* Enhanced User Info with Animated Avatar */}
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="relative"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.handle || entry.displayName || 'User avatar'}
                        className="w-12 h-12 rounded-full shadow-lg border-2 border-primary/20 object-cover"
                        onError={(e) => {
                          // Fallback to gradient circle if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-purple-500 to-accent flex items-center justify-center text-white font-bold text-lg shadow-lg relative overflow-hidden"
                      style={{ display: entry.avatarUrl ? 'none' : 'flex' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/20 to-white/0 animate-pulse"></div>
                      <span className="relative z-10">{(entry.handle || entry.displayName || '?').charAt(0).toUpperCase()}</span>
                    </div>
                    {/* Status Indicator */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-foreground truncate">
                      {entry.handle || entry.displayName || 'Anonymous Trader'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        {entry.totalTrades} trades
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Stats with Progress Bars */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">PnL</span>
                    <motion.span
                      className={cn(
                        "font-bold text-lg",
                        parseFloat(entry.totalPnlUsd) > 0 ? "text-green-500" : "text-red-500"
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      {formatUSD(parseFloat(entry.totalPnlUsd))}
                    </motion.span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="font-semibold">{entry.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "absolute left-0 top-0 h-full rounded-full",
                        entry.winRate > 50 ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-orange-500 to-red-500"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${entry.winRate}%` }}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Volume</span>
                    <span className="font-semibold">{formatUSD(parseFloat(entry.totalVolumeUsd))}</span>
                  </div>
                </div>
              </div>

              {/* Trophy Icon for #1 */}
              {index === 0 && (
                <motion.div
                  className="absolute -bottom-2 -right-2 opacity-10"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                >
                  <Trophy className="h-24 w-24" />
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rest of Leaderboard */}
      {rest.length > 0 && (
        <div className="stat-card">
          <h3 className="text-lg font-semibold mb-4">Full Rankings</h3>

          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rest.map((entry) => {
                const isCurrentUser = entry.userId === currentUserId
                return (
                  <div
                    key={entry.userId}
                    ref={isCurrentUser ? userRowRef as React.RefObject<HTMLDivElement | null> : undefined}
                  >
                    <LeaderboardRow
                      rank={entry.rank!}
                      name={entry.handle || entry.displayName || 'Anonymous'}
                      value={formatUSD(parseFloat(entry.totalPnlUsd))}
                      subtitle={`${entry.totalTrades} trades • ${entry.winRate.toFixed(1)}% win rate`}
                      change={getChangeTrend(entry.rank!)}
                      isCurrentUser={isCurrentUser}
                      avatar={
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold">
                          {entry.handle?.charAt(0).toUpperCase() || entry.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      }
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <Leaderboard>
              {rest.map((entry) => {
                const isCurrentUser = entry.userId === currentUserId
                return (
                  <div
                    key={entry.userId}
                    ref={isCurrentUser ? userRowRef as React.RefObject<HTMLDivElement | null> : undefined}
                  >
                    <LeaderboardRow
                      rank={entry.rank!}
                      name={entry.handle || entry.displayName || 'Anonymous'}
                      value={formatUSD(parseFloat(entry.totalPnlUsd))}
                      subtitle={`${entry.totalTrades} trades • ${entry.winRate.toFixed(1)}% win rate • Volume: ${formatUSD(parseFloat(entry.totalVolumeUsd))}`}
                      change={getChangeTrend(entry.rank!)}
                      isCurrentUser={isCurrentUser}
                      avatar={
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold">
                          {entry.handle?.charAt(0).toUpperCase() || entry.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      }
                    />
                  </div>
                )
              })}
            </Leaderboard>
          )}
        </div>
      )}
    </div>
  )
}