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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main id="leaderboard-table" className="w-full px-4 sm:px-6 lg:px-8 py-2 sm:py-4 max-w-page-xl mx-auto">
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

        {/* Header */}
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
            className="border-3 border-[var(--outline-black)] bg-white hover:bg-[var(--mario-red-500)] hover:text-white shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-[12px] bg-[var(--mario-red-50)] border-3 border-[var(--mario-red-500)] shadow-[3px_3px_0_var(--mario-red-500)]">
            <p className="text-[var(--mario-red-700)] font-semibold">{String(error)}</p>
          </div>
        )}

        {/* Time Range Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-4"
        >
          <div className="bg-white border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] px-6 py-3 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <TabsList className="bg-[var(--sky-100)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-[12px] p-1">
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-[var(--mario-red-500)] data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-[8px] font-bold transition-all text-[var(--outline-black)]"
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
                className="md:hidden border-3 border-[var(--outline-black)] bg-white hover:bg-[var(--luigi-green-500)] hover:text-white shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] transition-all duration-200 font-bold"
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
                className="w-full mb-4 border-3 border-[var(--outline-black)] bg-white hover:bg-[var(--mario-red-500)] hover:text-white shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] transition-all duration-200 font-bold" 
                onClick={() => setShowStats(!showStats)}
              >
                {showStats ? "Hide" : "Show"} Stats
              </Button>
            </div>

            <div className={`space-y-6 ${!showStats && "hidden lg:block"}`}>
              {/* Current User Rank */}
              {currentUser && (
                <div className="p-6 rounded-[16px] bg-[var(--sky-50)] border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
                  <div className="mb-4">
                    <h3 className="font-bold text-lg mb-2 text-[var(--outline-black)] font-mario">🎯 Your Rank</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-[var(--mario-red-500)]" />
                        <span className="text-sm text-[var(--outline-black)] font-semibold">Current Position</span>
                      </div>
                      <Badge className="text-lg px-3 py-1 bg-[var(--star-yellow-500)] text-[var(--outline-black)] border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] font-bold">
                        #{currentUser.rank}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t-3 border-[var(--outline-black)]">
                    <div>
                      <p className="text-sm text-[var(--outline-black)] mb-2 font-semibold">💰 Total PnL</p>
                      <div className={`font-bold text-lg ${parseFloat(currentUser.totalPnlUsd) >= 0 ? 'text-[var(--luigi-green-700)]' : 'text-[var(--mario-red-700)]'}`}>
                        <UsdWithSol 
                          usd={parseFloat(currentUser.totalPnlUsd)} 
                          prefix={parseFloat(currentUser.totalPnlUsd) >= 0 ? '+' : ''}
                          className="text-lg font-bold"
                          solClassName="text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--outline-black)] mb-2 font-semibold">📊 Trades</p>
                      <p className="font-bold text-lg text-[var(--outline-black)]">{currentUser.totalTrades}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--outline-black)] mb-2 font-semibold">🎯 Win Rate</p>
                      <p className="font-bold text-lg text-[var(--outline-black)]">{currentUser.winRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--outline-black)] mb-2 font-semibold">💎 Balance</p>
                      <p className="font-bold text-lg font-mono text-[var(--outline-black)]">
                        {balanceData ? `${parseFloat(balanceData.balance).toFixed(2)} SOL` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Performers */}
              {topPerformers.length > 0 && (
                <div className="p-6 rounded-[16px] bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-[var(--star-yellow-500)]" />
                      <h3 className="font-bold text-lg text-[var(--outline-black)] font-mario">🏆 Top Performers</h3>
                    </div>
                    <span className="text-sm text-[var(--outline-black)] font-semibold opacity-70">Leading traders</span>
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
                          className={`flex items-center justify-between p-3 rounded-[12px] ${color.bg} border-2 ${color.border} hover:opacity-90 transition-opacity shadow-[2px_2px_0_var(--outline-black)]`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${color.rank} text-[var(--outline-black)] border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] font-bold text-sm`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--outline-black)]">{performer.handle || performer.displayName || `User ${performer.userId.slice(0, 8)}`}</p>
                              <p className="text-xs text-[var(--outline-black)] opacity-70 font-semibold">{performer.totalTrades} trades</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${parseFloat(performer.totalPnlUsd) >= 0 ? 'text-[var(--luigi-green-700)]' : 'text-[var(--mario-red-700)]'}`}>
                              <UsdWithSol 
                                usd={parseFloat(performer.totalPnlUsd)} 
                                prefix={parseFloat(performer.totalPnlUsd) >= 0 ? '+' : ''}
                                className="font-bold"
                                solClassName="text-xs"
                              />
                            </div>
                            <p className="text-xs text-[var(--outline-black)] opacity-70 font-semibold">{performer.winRate.toFixed(1)}% win</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Competition Stats */}
              <div className="p-6 rounded-[16px] bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-[var(--outline-black)] font-mario">📊 Competition Stats</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b-2 border-[var(--outline-black)] border-opacity-20">
                    <span className="text-sm text-[var(--outline-black)] font-semibold opacity-70">Total Traders</span>
                    <span className="font-bold text-lg text-[var(--outline-black)]">{totalTraders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b-2 border-[var(--outline-black)] border-opacity-20">
                    <span className="text-sm text-[var(--outline-black)] font-semibold opacity-70">Active Today</span>
                    <span className="font-bold text-lg text-[var(--outline-black)]">{activeToday.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b-2 border-[var(--outline-black)] border-opacity-20">
                    <span className="text-sm text-[var(--outline-black)] font-semibold opacity-70">Avg PnL</span>
                    <div className={`font-bold text-lg ${avgROI >= 0 ? 'text-[var(--luigi-green-700)]' : 'text-[var(--mario-red-700)]'}`}>
                      <UsdWithSol
                        usd={avgROI}
                        prefix={avgROI >= 0 ? '+' : ''}
                        className="text-lg font-bold"
                        solClassName="text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--outline-black)] font-semibold opacity-70">Total Trades</span>
                    <span className="font-bold text-lg text-[var(--outline-black)]">{formatNumber(totalVolume, { useCompact: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
          <div className="absolute top-1/3 left-1/5 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-green-500/3 rounded-full blur-3xl"></div>
          <div className="absolute top-2/3 left-2/3 w-64 h-64 bg-blue-500/3 rounded-full blur-2xl"></div>
        </div>
      </main>
    </div>
  )
}
