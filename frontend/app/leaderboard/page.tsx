"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModernLeaderboard } from "@/components/leaderboard/modern-leaderboard"
import { Trophy, ArrowUp, ArrowDown, Minus, Target, RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type * as Backend from "@/lib/types/backend"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { formatUSD, formatNumber } from "@/lib/format"
import { motion } from "framer-motion"
import { MarioPageHeader } from "@/components/shared/mario-page-header"
import { cn, marioStyles } from "@/lib/utils"

type TimeRange = "24h" | "7d" | "all"

export default function LeaderboardPage() {
  const { user, isAuthenticated } = useAuth()
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [showStats, setShowStats] = useState(true)
  const [leaderboardData, setLeaderboardData] = useState<Backend.LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const userRowRef = useRef<HTMLElement>(null)

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
  }, []) // Remove fetchLeaderboard dependency to prevent loops

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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main id="leaderboard-table" className="w-full px-4 sm:px-6 lg:px-8 py-2 sm:py-4 max-w-7xl mx-auto">
        {/* Mario Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <MarioPageHeader
            src="/leaderboard-header.png"
            alt="Leaderboard"
            width={750}
            height={120}
            priority
          />
        </motion.div>

        {/* Header with Refresh Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex justify-end"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              marioStyles.iconButton('primary'),
              'w-10 h-10'
            )}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className={cn(
            marioStyles.cardSm(false),
            'mb-6 bg-gradient-to-br from-[var(--mario-red)]/10 to-white'
          )}>
            <p className="text-[var(--mario-red)] font-bold">{String(error)}</p>
          </div>
        )}

        {/* Time Range Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-4"
        >
          <div className={cn(
            marioStyles.cardLg(false),
            'flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'
          )}>
            <div className="flex items-center gap-4">
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <TabsList>
                  <TabsTrigger 
                    value="all" 
                    className="mario-tab-red"
                  >
                    All Time
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="text-xs text-[var(--outline-black)] opacity-70 font-semibold">
                (24h and 7d filters coming soon)
              </span>
            </div>

            {currentUser && (
              <Button 
                variant="outline" 
                onClick={scrollToUserRank} 
                className={cn(
                  'md:hidden',
                  marioStyles.button('secondary', 'md')
                )}
              >
                <Target className="h-4 w-4 mr-2" />
                View My Rank
              </Button>
            )}
          </div>
        </motion.div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Leaderboard Table */}
          <div className="lg:col-span-2">
            <ModernLeaderboard
              timeRange={timeRange}
              currentUserId={currentUserId || undefined}
              userRowRef={userRowRef}
              loading={loading}
              data={leaderboardData}
              userStats={currentUser ? {
                rank: currentUser.rank || 0,
                totalPnl: parseFloat(currentUser.totalPnlUsd),
                trades: currentUser.totalTrades,
                winRate: currentUser.winRate,
                balance: balanceData ? parseFloat(balanceData.balance) : 0
              } : undefined}
            />
          </div>

          {/* Right: Stats & Highlights */}
          <div className="space-y-6">
            {/* Mobile: Collapsible Stats */}
            <div className="lg:hidden">
              <Button 
                variant="outline" 
                className={cn(
                  'w-full mb-4',
                  marioStyles.button('danger', 'md')
                )}
                onClick={() => setShowStats(!showStats)}
              >
                {showStats ? "Hide" : "Show"} Stats
              </Button>
            </div>

            <div className={`space-y-6 ${!showStats && "hidden lg:block"}`}>
              {/* Current User Rank */}
              {currentUser && (
                <div className={cn(
                  marioStyles.cardLg(false),
                  'bg-gradient-to-br from-[var(--sky-blue)]/20 to-white'
                )}>
                  <div className="mb-4">
                    <h3 className={cn(marioStyles.heading(4), 'mb-2')}>🎯 Your Rank</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-[var(--mario-red)]" />
                        <span className={marioStyles.bodyText('semibold')}>Current Position</span>
                      </div>
                      <Badge className={cn(
                        'text-lg px-3 py-1 bg-[var(--star-yellow)] text-[var(--outline-black)]',
                        marioStyles.shadowSm,
                        'border-2 border-[var(--outline-black)] font-bold'
                      )}>
                        #{currentUser.rank}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t-3 border-[var(--outline-black)]">
                    <div>
                      <p className={cn(marioStyles.bodyText('semibold'), 'text-sm mb-2')}>💰 Total PnL</p>
                      <div className={`font-bold text-lg ${parseFloat(currentUser.totalPnlUsd) >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'}`}>
                        <UsdWithSol 
                          usd={parseFloat(currentUser.totalPnlUsd)} 
                          prefix={parseFloat(currentUser.totalPnlUsd) >= 0 ? '+' : ''}
                          className="text-lg font-bold"
                          solClassName="text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <p className={cn(marioStyles.bodyText('semibold'), 'text-sm mb-2')}>📊 Trades</p>
                      <p className="font-bold text-lg text-[var(--outline-black)]">{currentUser.totalTrades}</p>
                    </div>
                    <div>
                      <p className={cn(marioStyles.bodyText('semibold'), 'text-sm mb-2')}>🎯 Win Rate</p>
                      <p className="font-bold text-lg text-[var(--outline-black)]">{currentUser.winRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className={cn(marioStyles.bodyText('semibold'), 'text-sm mb-2')}>💎 Balance</p>
                      <p className="font-bold text-lg font-mono text-[var(--outline-black)]">
                        {balanceData ? `${parseFloat(balanceData.balance).toFixed(2)} SOL` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Performers */}
              {topPerformers.length > 0 && (
                <div className={marioStyles.cardLg(false)}>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-[var(--star-yellow)]" />
                      <h3 className={marioStyles.heading(4)}>🏆 Top Performers</h3>
                    </div>
                    <span className={cn(marioStyles.bodyText('semibold'), 'text-sm opacity-70')}>Leading traders</span>
                  </div>
                  <div className="space-y-3">
                    {topPerformers.map((performer, index) => {
                      const colors = [
                        { bg: 'bg-[#FFD700]', border: 'border-[#FFA500]', rank: 'bg-[#FFD700]' }, // Gold
                        { bg: 'bg-[#C0C0C0]', border: 'border-[#A9A9A9]', rank: 'bg-[#C0C0C0]' }, // Silver
                        { bg: 'bg-[#CD7F32]', border: 'border-[#8B4513]', rank: 'bg-[#CD7F32]' }  // Bronze
                      ]
                      const color = colors[index]
                      
                      return (
                        <div
                          key={performer.userId}
                          className={cn(
                            `flex items-center justify-between p-3 rounded-xl ${color.bg} border-2 ${color.border}`,
                            marioStyles.shadowSm,
                            'hover:opacity-90 transition-opacity'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              `flex items-center justify-center w-8 h-8 rounded-full ${color.rank} text-[var(--outline-black)]`,
                              marioStyles.shadowSm,
                              'border-2 border-[var(--outline-black)] font-bold text-sm'
                            )}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--outline-black)]">{performer.handle || performer.displayName || `User ${performer.userId.slice(0, 8)}`}</p>
                              <p className={cn(marioStyles.bodyText('semibold'), 'text-xs opacity-70')}>{performer.totalTrades} trades</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${parseFloat(performer.totalPnlUsd) >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'}`}>
                              <UsdWithSol 
                                usd={parseFloat(performer.totalPnlUsd)} 
                                prefix={parseFloat(performer.totalPnlUsd) >= 0 ? '+' : ''}
                                className="font-bold"
                                solClassName="text-xs"
                              />
                            </div>
                            <p className={cn(marioStyles.bodyText('semibold'), 'text-xs opacity-70')}>{performer.winRate.toFixed(1)}% win</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Competition Stats */}
              <div className={marioStyles.cardLg(false)}>
                <div className="mb-6">
                  <h3 className={marioStyles.heading(4)}>📊 Competition Stats</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b-2 border-[var(--outline-black)] border-opacity-20">
                    <span className={cn(marioStyles.bodyText('semibold'), 'text-sm opacity-70')}>Total Traders</span>
                    <span className="font-bold text-lg text-[var(--outline-black)]">{totalTraders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b-2 border-[var(--outline-black)] border-opacity-20">
                    <span className={cn(marioStyles.bodyText('semibold'), 'text-sm opacity-70')}>Active Today</span>
                    <span className="font-bold text-lg text-[var(--outline-black)]">{activeToday.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b-2 border-[var(--outline-black)] border-opacity-20">
                    <span className={cn(marioStyles.bodyText('semibold'), 'text-sm opacity-70')}>Avg PnL</span>
                    <div className={`font-bold text-lg ${avgROI >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'}`}>
                      <UsdWithSol
                        usd={avgROI}
                        prefix={avgROI >= 0 ? '+' : ''}
                        className="text-lg font-bold"
                        solClassName="text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={cn(marioStyles.bodyText('semibold'), 'text-sm opacity-70')}>Total Trades</span>
                    <span className="font-bold text-lg text-[var(--outline-black)]">{formatNumber(totalVolume, { useCompact: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
