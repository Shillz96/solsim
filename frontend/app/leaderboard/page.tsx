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
      <main className="w-full px-4 sm:px-6 lg:px-8 py-2 sm:py-4 max-w-page-xl mx-auto">
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
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Top Traders
              </h1>
              <p className="text-lg text-muted-foreground">Compete with traders worldwide and climb the ranks</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-destructive">{String(error)}</p>
          </div>
        )}

        {/* Time Range Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-4"
        >
          <div className="bg-card border border-border rounded-lg px-6 py-3 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <TabsList>
                  <TabsTrigger value="all">All Time</TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="text-xs text-muted-foreground">
                (24h and 7d filters coming soon)
              </span>
            </div>

            {currentUser && (
              <Button variant="outline" onClick={scrollToUserRank} className="md:hidden">
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
              <Button variant="outline" className="w-full mb-4" onClick={() => setShowStats(!showStats)}>
                {showStats ? "Hide" : "Show"} Stats
              </Button>
            </div>

            <div className={`space-y-6 ${!showStats && "hidden lg:block"}`}>
              {/* Current User Rank */}
              {currentUser && (
                <div className="p-6 rounded-lg bg-muted/20 border border-border/50">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2">Your Rank</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">Current Position</span>
                      </div>
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        #{currentUser.rank}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Total PnL</p>
                      <div className={`font-semibold text-lg ${parseFloat(currentUser.totalPnlUsd) >= 0 ? 'text-profit' : 'text-loss'}`}>
                        <UsdWithSol 
                          usd={parseFloat(currentUser.totalPnlUsd)} 
                          prefix={parseFloat(currentUser.totalPnlUsd) >= 0 ? '+' : ''}
                          className="text-lg font-semibold"
                          solClassName="text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Trades</p>
                      <p className="font-semibold text-lg">{currentUser.totalTrades}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Win Rate</p>
                      <p className="font-semibold text-lg">{currentUser.winRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Balance</p>
                      <p className="font-semibold text-lg font-mono">
                        {balanceData ? `${parseFloat(balanceData.balance).toFixed(2)} SOL` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Performers */}
              {topPerformers.length > 0 && (
                <div className="p-6 rounded-lg bg-card border border-border/50">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-semibold text-lg">Top Performers</h3>
                    </div>
                    <span className="text-sm text-muted-foreground">Leading traders</span>
                  </div>
                  <div className="space-y-3">
                    {topPerformers.map((performer, index) => (
                      <div
                        key={performer.userId}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{performer.handle || performer.displayName || `User ${performer.userId.slice(0, 8)}`}</p>
                            <p className="text-xs text-muted-foreground">{performer.totalTrades} trades</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${parseFloat(performer.totalPnlUsd) >= 0 ? 'text-profit' : 'text-loss'}`}>
                            <UsdWithSol 
                              usd={parseFloat(performer.totalPnlUsd)} 
                              prefix={parseFloat(performer.totalPnlUsd) >= 0 ? '+' : ''}
                              className="font-semibold"
                              solClassName="text-xs"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{performer.winRate.toFixed(1)}% win</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="p-6 rounded-lg bg-card border border-border/50">
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">Competition Stats</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Traders</span>
                    <span className="font-semibold text-lg">{totalTraders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Today</span>
                    <span className="font-semibold text-lg">{activeToday.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg PnL</span>
                    <div className={`font-semibold text-lg ${avgROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      <UsdWithSol
                        usd={avgROI}
                        prefix={avgROI >= 0 ? '+' : ''}
                        className="text-lg font-semibold font-mono"
                        solClassName="text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Trades</span>
                    <span className="font-semibold text-lg font-mono">{formatNumber(totalVolume, { useCompact: true })}</span>
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
