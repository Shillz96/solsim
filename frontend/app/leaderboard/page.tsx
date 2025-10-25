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
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Leaderboard Header Image */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-center justify-between"
        >
          <Image
            src="/leaderboard-10-25-2025.png"
            alt="Leaderboard"
            width={750}
            height={120}
            priority
            className="w-auto h-auto max-w-full"
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
                <h2 className={marioStyles.heading(3)}>Top Performers</h2>
                <p className={cn(marioStyles.bodyText('semibold'), 'text-sm opacity-70 mt-1')}>
                  Podium finishers
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--outline-black)] border-t-[var(--star-yellow)] mx-auto"></div>
                  <p className={cn(marioStyles.bodyText('semibold'), 'mt-3 text-sm')}>Loading...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topPerformers.map((entry, index) => (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={cn(
                        "relative p-4 rounded-lg border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] transition-all duration-200 hover:scale-105",
                        index === 0 && "bg-gradient-to-br from-[var(--coin-gold)]/20 to-[var(--coin-gold)]/10",
                        index === 1 && "bg-gradient-to-br from-[var(--pipe-300)]/20 to-[var(--pipe-300)]/10",
                        index === 2 && "bg-gradient-to-br from-[var(--brick-brown)]/20 to-[var(--brick-brown)]/10"
                      )}
                    >
                      {/* Rank Badge */}
                      <div className="absolute -top-2 -left-2 w-8 h-8 bg-[var(--outline-black)] border-2 border-[var(--outline-black)] rounded-full flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
                        <span className="text-white font-bold text-sm">
                          {index + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Medal Icon */}
                        <div className="flex-shrink-0">
                          {getMedalIcon(index + 1)}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-[var(--outline-black)] truncate">
                              {entry.displayName || entry.handle || 'Anonymous'}
                            </h3>
                            {index === 0 && (
                              <Crown className="h-5 w-5 text-[var(--coin-gold)] flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-[var(--outline-black)] font-semibold">PnL:</span>
                              <span className={cn(
                                "font-bold",
                                parseFloat(entry.totalPnlUsd) >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
                              )}>
                                <UsdWithSol
                                  usd={parseFloat(entry.totalPnlUsd)}
                                  prefix={parseFloat(entry.totalPnlUsd) >= 0 ? '+' : ''}
                                  className="font-bold"
                                  solClassName="text-xs"
                                />
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[var(--outline-black)] font-semibold">Trades:</span>
                              <span className="font-bold text-[var(--outline-black)]">
                                {entry.totalTrades}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
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
                {/* Removed "Full Leaderboard" title and description */}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--outline-black)] border-t-[var(--star-yellow)] mx-auto"></div>
                  <p className={cn(marioStyles.bodyText('semibold'), 'mt-4')}>Loading leaderboard...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboardData.map((entry, index) => {
                    const isCurrentUser = entry.userId === currentUserId
                    const rank = index + 1
                    
                    return (
                      <motion.div
                        key={entry.userId}
                        ref={isCurrentUser ? userRowRef : null}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-lg border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[3px_3px_0_var(--outline-black)]",
                          isCurrentUser && "bg-gradient-to-r from-[var(--star-yellow)]/20 to-[var(--coin-gold)]/20 border-[var(--star-yellow)]",
                          rank <= 3 && "bg-gradient-to-r from-[var(--coin-gold)]/10 to-[var(--star-yellow)]/10"
                        )}
                      >
                        {/* Rank */}
                        <div className="flex-shrink-0 w-8 text-center">
                          <span className={cn(
                            "font-bold text-lg",
                            rank <= 3 ? "text-[var(--outline-black)]" : "text-[var(--pipe-600)]"
                          )}>
                            #{rank}
                          </span>
                        </div>

                        {/* Medal Icon for top 3 */}
                        {rank <= 3 && (
                          <div className="flex-shrink-0">
                            {getMedalIcon(rank)}
                          </div>
                        )}

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={cn(
                              "font-bold text-lg truncate",
                              isCurrentUser ? "text-[var(--outline-black)]" : "text-[var(--outline-black)]"
                            )}>
                              {entry.displayName || entry.handle || 'Anonymous'}
                            </h3>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="bg-[var(--star-yellow)] text-[var(--outline-black)] border-[var(--outline-black)]">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-[var(--pipe-600)] font-semibold">PnL</p>
                            <p className={cn(
                              "font-bold text-lg",
                              parseFloat(entry.totalPnlUsd) >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
                            )}>
                              <UsdWithSol
                                usd={parseFloat(entry.totalPnlUsd)}
                                prefix={parseFloat(entry.totalPnlUsd) >= 0 ? '+' : ''}
                                className="font-bold"
                                solClassName="text-xs"
                              />
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[var(--pipe-600)] font-semibold">Trades</p>
                            <p className="font-bold text-lg text-[var(--outline-black)]">
                              {entry.totalTrades}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
