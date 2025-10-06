"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponsiveLeaderboard } from "@/components/leaderboard/responsive-leaderboard"
import { Trophy, ArrowUp, ArrowDown, Minus, Target, RefreshCw } from "lucide-react"
import leaderboardService from "@/lib/leaderboard-service"
import authService from "@/lib/auth-service"
import type { LeaderboardEntry } from "@/lib/leaderboard-service"

type TimeRange = "24h" | "7d" | "all"

export default function LeaderboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [showStats, setShowStats] = useState(true)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const userRowRef = useRef<HTMLElement>(null)

  const scrollToUserRank = () => {
    userRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setError(null)
      const data = await leaderboardService.getLeaderboard()
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
      if (authService.isAuthenticated()) {
        try {
          const profile = await authService.getProfile()
          setCurrentUserId(profile.id)
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
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard, timeRange])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchLeaderboard()
  }

  // Calculate stats from leaderboard data
  const topPerformers = leaderboardData.slice(0, 3)
  const currentUser = leaderboardData.find(entry => entry.id === currentUserId)
  
  const totalTraders = leaderboardData.length
  const activeToday = leaderboardData.filter(entry => {
    if (!entry.lastTradeDate) return false
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    return entry.lastTradeDate > dayAgo
  }).length

  const avgROI = totalTraders > 0
    ? leaderboardData.reduce((sum, entry) => sum + entry.totalPnL, 0) / totalTraders
    : 0

  const totalVolume = leaderboardData.reduce((sum, entry) => sum + entry.balance, 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-space-grotesk text-4xl md:text-5xl font-bold mb-4">
                <span className="gradient-text">Leaderboard</span>
              </h1>
              <p className="text-lg text-muted-foreground">Compete with traders worldwide and climb the ranks</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="card-enhanced p-4 mb-6 bg-destructive/10 border-destructive/20">
            <p className="text-destructive">{String(error)}</p>
          </Card>
        )}

        {/* Time Range Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList>
              <TabsTrigger value="24h">24 Hours</TabsTrigger>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>

          {currentUser && (
            <Button variant="outline" onClick={scrollToUserRank} className="md:hidden bg-transparent">
              <Target className="h-4 w-4 mr-2" />
              View My Rank
            </Button>
          )}
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Leaderboard Table */}
          <div className="lg:col-span-2">
            <ResponsiveLeaderboard 
              timeRange={timeRange} 
              currentUserId={currentUserId || undefined} 
              userRowRef={userRowRef}
              loading={loading}
              data={leaderboardData}
            />
          </div>

          {/* Right: Stats & Highlights */}
          <div className="space-y-6">
            {/* Mobile: Collapsible Stats */}
            <div className="lg:hidden">
              <Button variant="outline" className="w-full mb-4 bg-transparent" onClick={() => setShowStats(!showStats)}>
                {showStats ? "Hide" : "Show"} Stats
              </Button>
            </div>

            <div className={`space-y-6 ${!showStats && "hidden lg:block"}`}>
              {/* Current User Rank */}
              {currentUser && (
                <Card className="bento-card p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Your Rank</h3>
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        #{currentUser.rank}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentUser.previousRank && currentUser.rank && currentUser.rank < currentUser.previousRank && (
                        <div className="flex items-center gap-1 text-green-500">
                          <ArrowUp className="h-4 w-4" />
                          <span className="text-sm font-medium">+{currentUser.previousRank - currentUser.rank}</span>
                        </div>
                      )}
                      {currentUser.previousRank && currentUser.rank && currentUser.rank > currentUser.previousRank && (
                        <div className="flex items-center gap-1 text-red-500">
                          <ArrowDown className="h-4 w-4" />
                          <span className="text-sm font-medium">-{currentUser.rank - currentUser.previousRank}</span>
                        </div>
                      )}
                      {currentUser.previousRank && currentUser.rank === currentUser.previousRank && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Minus className="h-4 w-4" />
                          <span className="text-sm font-medium">No change</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total PnL</p>
                        <p className={`font-bold ${currentUser.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {currentUser.totalPnL >= 0 ? '+' : ''}{currentUser.totalPnL.toFixed(2)} SOL
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Trades</p>
                        <p className="font-bold">{currentUser.totalTrades}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                        <p className="font-bold">{currentUser.winRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Balance</p>
                        <p className="font-bold font-mono">{currentUser.balance.toFixed(2)} SOL</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Top Performers */}
              {topPerformers.length > 0 && (
                <Card className="trading-card p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Top Performers
                  </h3>
                  <div className="space-y-4">
                    {topPerformers.map((performer, index) => (
                      <div
                        key={performer.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{performer.username}</p>
                            <p className="text-xs text-muted-foreground">{performer.totalTrades} trades</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${performer.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {performer.totalPnL >= 0 ? '+' : ''}{performer.totalPnL.toFixed(2)} SOL
                          </p>
                          <p className="text-xs text-muted-foreground">{performer.winRate.toFixed(1)}% win</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Quick Stats */}
              <Card className="card-enhanced p-6">
                <h3 className="font-semibold text-lg mb-4">Competition Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Traders</span>
                    <span className="font-bold">{totalTraders.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Today</span>
                    <span className="font-bold">{activeToday.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg PnL</span>
                    <span className={`font-bold ${avgROI >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {avgROI >= 0 ? '+' : ''}{avgROI.toFixed(2)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Volume</span>
                    <span className="font-bold">{totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
