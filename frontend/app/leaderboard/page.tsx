"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Target, RefreshCw, Crown, Medal, Star, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type * as Backend from "@/lib/types/backend"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { formatUSD, formatNumber } from "@/lib/format"
import { motion, AnimatePresence } from "framer-motion"
import { MarioPageHeader } from "@/components/shared/mario-page-header"
import { cn, marioStyles } from "@/lib/utils"

type TimeRange = "24h" | "7d" | "all"

export default function LeaderboardPage() {
  const { user, isAuthenticated } = useAuth()
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [leaderboardData, setLeaderboardData] = useState<Backend.LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const userRowRef = useRef<HTMLDivElement>(null)

  const scrollToUserRank = () => {
    userRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  // Fetch user balance
  const { data: balanceData } = useQuery({
    queryKey: ['user-balance', user?.id],
    queryFn: () => api.getWalletBalance(user!.id),
    enabled: !!user && isAuthenticated,
    staleTime: 30000,
  })

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setError(null)
      const data = await api.getLeaderboard()
      setLeaderboardData(data)
    } catch (err) {
      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.error('Failed to fetch leaderboard', {
          error: err as Error,
          action: 'leaderboard_fetch_failed',
          metadata: { component: 'LeaderboardPage' }
        })
      })
      setError('Failed to load leaderboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Get current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (isAuthenticated && user) {
        try {
          setCurrentUserId(user.id)
        } catch (err) {
          import('@/lib/error-logger').then(({ errorLogger }) => {
            errorLogger.error('Failed to fetch user profile', {
              error: err as Error,
              action: 'user_profile_fetch_failed',
              metadata: { component: 'LeaderboardPage' }
            })
          })
        }
      }
    }

    fetchCurrentUser()
  }, [isAuthenticated, user])

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchLeaderboard()
  }

  // Calculate stats from leaderboard data
  const topPerformers = leaderboardData.slice(0, 3)
  const currentUser = leaderboardData.find(entry => entry.userId === currentUserId)
  
  const totalTraders = leaderboardData.length
  const activeToday = leaderboardData.filter(entry => entry.totalTrades > 0).length

  const avgROI = totalTraders > 0
    ? leaderboardData.reduce((sum, entry) => sum + parseFloat(entry.totalPnlUsd), 0) / totalTraders
    : 0

  const totalVolume = leaderboardData.reduce((sum, entry) => sum + entry.totalTrades, 0)

  // Get medal color based on rank
  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-[var(--coin-gold)]" />
      case 2:
        return <Medal className="h-6 w-6 text-[var(--pipe-300)]" />
      case 3:
        return <Medal className="h-6 w-6 text-[var(--brick-brown)]" />
      default:
        return <Star className="h-5 w-5 text-[var(--sky-blue)]" />
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Full Width Container */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1600px] mx-auto">
        {/* Mario Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-center justify-between"
        >
          <MarioPageHeader
            src="/leaderboard-header.png"
            alt="Leaderboard"
            width={750}
            height={120}
            priority
          />
          
          {/* Controls moved to header level */}
          <div className="flex items-center gap-2">
            {currentUser && (
              <Button 
                variant="outline" 
                onClick={scrollToUserRank} 
                className={cn(marioStyles.button('secondary', 'md'))}
              >
                <Target className="h-4 w-4 mr-2" />
                View My Rank
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className={cn(marioStyles.iconButton('primary'), 'w-10 h-10')}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                marioStyles.cardSm(false),
                'mb-6 bg-gradient-to-br from-[var(--mario-red)]/10 to-[var(--mario-red)]/5'
              )}
            >
              <p className="text-[var(--mario-red)] font-bold">{String(error)}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Competition Stats Overview - Docs Style Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Traders Card */}
            <div className="mario-card">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Image 
                    src="/icons/mario/user.png" 
                    alt="Traders" 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Total Traders</h3>
                  <p className="text-2xl font-bold text-[var(--outline-black)]">
                    {totalTraders.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Today Card */}
            <div className="mario-card">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Image 
                    src="/icons/mario/fire.png" 
                    alt="Active" 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Active Today</h3>
                  <p className="text-2xl font-bold text-[var(--outline-black)]">
                    {activeToday.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Average PnL Card */}
            <div className="mario-card">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--sky-blue)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Image 
                    src="/icons/mario/trending.png" 
                    alt="PnL" 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Avg PnL</h3>
                  <div className={`text-2xl font-bold ${avgROI >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'}`}>
                    <UsdWithSol
                      usd={avgROI}
                      prefix={avgROI >= 0 ? '+' : ''}
                      className="text-2xl font-bold"
                      solClassName="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Trades Card */}
            <div className="mario-card">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--coin-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Image 
                    src="/icons/mario/trophy.png" 
                    alt="Trades" 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Total Trades</h3>
                  <p className="text-2xl font-bold text-[var(--outline-black)]">
                    {formatNumber(totalVolume, { useCompact: true })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Side: Top 3 Performers */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="xl:col-span-4"
          >
            <div className={marioStyles.cardLg(false)}>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-6 w-6 text-[var(--coin-gold)]" />
                  <h2 className={marioStyles.heading(3)}>Top Performers</h2>
                </div>
                <p className={cn(marioStyles.bodyText('semibold'), 'text-sm opacity-70')}>
                  Leading the competition
                </p>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--outline-black)] border-t-[var(--star-yellow)] mx-auto"></div>
                    <p className={cn(marioStyles.bodyText('semibold'), 'mt-4')}>Loading...</p>
                  </div>
                ) : topPerformers.length > 0 ? (
                  topPerformers.map((performer, index) => {
                    const rankColors = [
                      { 
                        bg: 'from-[var(--coin-gold)] to-[var(--star-yellow)]',
                        border: 'border-[var(--coin-gold)]',
                        text: 'text-[var(--outline-black)]'
                      },
                      { 
                        bg: 'from-gray-300 to-gray-400',
                        border: 'border-gray-400',
                        text: 'text-[var(--outline-black)]'
                      },
                      { 
                        bg: 'from-[var(--brick-brown)] to-amber-700',
                        border: 'border-[var(--brick-brown)]',
                        text: 'text-white'
                      }
                    ]
                    const color = rankColors[index]
                    
                    return (
                      <motion.div
                        key={performer.userId}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={cn(
                          'p-4 rounded-xl border-4 border-[var(--outline-black)]',
                          'shadow-[4px_4px_0_var(--outline-black)]',
                          `bg-gradient-to-br ${color.bg}`,
                          'hover:shadow-[6px_6px_0_var(--outline-black)]',
                          'hover:-translate-y-1 transition-all'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={cn(
                              'flex items-center justify-center w-12 h-12',
                              'rounded-full border-3 border-[var(--outline-black)]',
                              'bg-white shadow-[2px_2px_0_var(--outline-black)]'
                            )}>
                              {getMedalIcon(index + 1)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn('font-bold text-lg truncate', color.text)}>
                                {performer.handle || performer.displayName || `User ${performer.userId.slice(0, 8)}`}
                              </p>
                              <p className={cn('text-sm font-semibold opacity-90', color.text)}>
                                {performer.totalTrades} trades • {performer.winRate.toFixed(1)}% win
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              'font-bold text-lg',
                              parseFloat(performer.totalPnlUsd) >= 0 
                                ? 'text-[var(--luigi-green)]' 
                                : 'text-[var(--mario-red)]'
                            )}>
                              <UsdWithSol 
                                usd={parseFloat(performer.totalPnlUsd)} 
                                prefix={parseFloat(performer.totalPnlUsd) >= 0 ? '+' : ''}
                                className="font-bold text-lg"
                                solClassName="text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-[var(--outline-black)] opacity-30" />
                    <p className={marioStyles.bodyText('semibold')}>No data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Current User Rank Card */}
            {currentUser && (
              <motion.div
                ref={userRowRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-6"
              >
                <div className={cn(
                  marioStyles.cardLg(false),
                  'bg-gradient-to-br from-[var(--star-yellow)]/30 to-[var(--star-yellow)]/5'
                )}>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={marioStyles.heading(3)}>
                        🎯 Your Rank
                      </h3>
                      <Badge className={cn(
                        'text-xl px-4 py-2',
                        'bg-[var(--coin-gold)] text-[var(--outline-black)]',
                        'border-3 border-[var(--outline-black)]',
                        marioStyles.shadowMd,
                        'font-bold'
                      )}>
                        #{currentUser.rank}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn(
                      'p-3 rounded-lg',
                      'bg-[var(--star-yellow)]/20 border-2 border-[var(--outline-black)]'
                    )}>
                      <p className={cn(marioStyles.bodyText('semibold'), 'text-xs mb-2 opacity-70')}>
                        💰 Total PnL
                      </p>
                      <div className={cn(
                        'font-bold text-lg',
                        parseFloat(currentUser.totalPnlUsd) >= 0 
                          ? 'text-[var(--luigi-green)]' 
                          : 'text-[var(--mario-red)]'
                      )}>
                        <UsdWithSol 
                          usd={parseFloat(currentUser.totalPnlUsd)} 
                          prefix={parseFloat(currentUser.totalPnlUsd) >= 0 ? '+' : ''}
                          className="text-lg font-bold"
                          solClassName="text-xs"
                        />
                      </div>
                    </div>

                    <div className={cn(
                      'p-3 rounded-lg',
                      'bg-[var(--sky-blue)]/20 border-2 border-[var(--outline-black)]'
                    )}>
                      <p className={cn(marioStyles.bodyText('semibold'), 'text-xs mb-2 opacity-70')}>
                        📊 Trades
                      </p>
                      <p className="font-bold text-lg text-[var(--outline-black)]">
                        {currentUser.totalTrades}
                      </p>
                    </div>

                    <div className={cn(
                      'p-3 rounded-lg',
                      'bg-[var(--luigi-green)]/20 border-2 border-[var(--outline-black)]'
                    )}>
                      <p className={cn(marioStyles.bodyText('semibold'), 'text-xs mb-2 opacity-70')}>
                        🎯 Win Rate
                      </p>
                      <p className="font-bold text-lg text-[var(--outline-black)]">
                        {currentUser.winRate.toFixed(1)}%
                      </p>
                    </div>

                    <div className={cn(
                      'p-3 rounded-lg',
                      'bg-[var(--coin-gold)]/20 border-2 border-[var(--outline-black)]'
                    )}>
                      <p className={cn(marioStyles.bodyText('semibold'), 'text-xs mb-2 opacity-70')}>
                        💎 Balance
                      </p>
                      <p className="font-bold text-lg font-mono text-[var(--outline-black)]">
                        {balanceData ? `${parseFloat(balanceData.balance).toFixed(2)} SOL` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right Side: Full Leaderboard Table */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="xl:col-span-8"
          >
            <div className={marioStyles.cardLg(false)}>
              <div className="mb-6">
                <h2 className={marioStyles.heading(3)}>Full Leaderboard</h2>
                <p className={cn(marioStyles.bodyText('semibold'), 'text-sm opacity-70 mt-1')}>
                  All competitors ranked by total PnL
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--outline-black)] border-t-[var(--star-yellow)] mx-auto"></div>
                  <p className={cn(marioStyles.bodyText('semibold'), 'mt-4')}>Loading leaderboard...</p>
                </div>
              ) : leaderboardData.length > 0 ? (
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className={cn(
                    'grid grid-cols-12 gap-4 p-3 rounded-lg',
                    'bg-gradient-to-r from-[var(--luigi-green)] to-[var(--pipe-green)]',
                    'border-3 border-[var(--outline-black)]',
                    marioStyles.shadowSm,
                    'text-white font-bold text-sm'
                  )}>
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-3">Player</div>
                    <div className="col-span-2 text-right">PnL</div>
                    <div className="col-span-2 text-right">Trades</div>
                    <div className="col-span-2 text-right">Win Rate</div>
                    <div className="col-span-2 text-right">ROI</div>
                  </div>

                  {/* Leaderboard Rows */}
                  <div className="max-h-[800px] overflow-y-auto space-y-2 pr-2">
                    {leaderboardData.map((entry, index) => {
                      const isCurrentUser = entry.userId === currentUserId
                      const pnl = parseFloat(entry.totalPnlUsd)
                      const volume = parseFloat(entry.totalVolumeUsd)
                      const roi = volume > 0 ? (pnl / volume) * 100 : 0

                      return (
                        <motion.div
                          key={entry.userId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          className={cn(
                            'grid grid-cols-12 gap-4 p-3 rounded-lg',
                            'border-3 transition-all',
                            isCurrentUser 
                              ? 'bg-gradient-to-r from-[var(--star-yellow)]/30 to-[var(--star-yellow)]/10 border-[var(--star-yellow)] shadow-[4px_4px_0_var(--star-yellow)]'
                              : 'bg-[var(--card)] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5'
                          )}
                        >
                          {/* Rank */}
                          <div className="col-span-1 flex items-center">
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center',
                              'border-2 border-[var(--outline-black)]',
                              'font-bold text-sm',
                              entry.rank <= 3 
                                ? 'bg-gradient-to-br from-[var(--coin-gold)] to-[var(--star-yellow)] text-[var(--outline-black)]'
                                : 'bg-[var(--sky-blue)] text-white'
                            )}>
                              {entry.rank}
                            </div>
                          </div>

                          {/* Player */}
                          <div className="col-span-3 flex items-center">
                            <div className="truncate">
                              <p className={cn(
                                'font-bold truncate',
                                isCurrentUser && 'text-[var(--mario-red)]'
                              )}>
                                {entry.handle || entry.displayName || `User ${entry.userId.slice(0, 8)}`}
                                {isCurrentUser && ' (You)'}
                              </p>
                            </div>
                          </div>

                          {/* PnL */}
                          <div className="col-span-2 flex items-center justify-end">
                            <div className={cn(
                              'font-bold',
                              pnl >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
                            )}>
                              <UsdWithSol 
                                usd={pnl} 
                                prefix={pnl >= 0 ? '+' : ''}
                                className="font-bold"
                                solClassName="text-xs"
                              />
                            </div>
                          </div>

                          {/* Trades */}
                          <div className="col-span-2 flex items-center justify-end">
                            <span className={marioStyles.bodyText('bold')}>
                              {entry.totalTrades}
                            </span>
                          </div>

                          {/* Win Rate */}
                          <div className="col-span-2 flex items-center justify-end">
                            <Badge className={cn(
                              'border-2 border-[var(--outline-black)]',
                              entry.winRate >= 50 
                                ? 'bg-[var(--luigi-green)] text-white'
                                : 'bg-[var(--mario-red)] text-white',
                              'font-bold'
                            )}>
                              {entry.winRate.toFixed(1)}%
                            </Badge>
                          </div>

                          {/* ROI */}
                          <div className="col-span-2 flex items-center justify-end">
                            <span className={cn(
                              'font-bold',
                              roi >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
                            )}>
                              {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                            </span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-[var(--outline-black)] opacity-30" />
                  <p className={marioStyles.heading(4)}>No leaderboard data</p>
                  <p className={cn(marioStyles.bodyText('semibold'), 'text-sm mt-2 opacity-70')}>
                    Start trading to appear on the leaderboard!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
