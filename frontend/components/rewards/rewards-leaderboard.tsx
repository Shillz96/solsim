"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Trophy, Medal, Award, Crown, Star, TrendingUp,
  Users, Zap, Target, Coins, ArrowUp, ArrowDown
} from "lucide-react"
import * as api from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { formatNumber, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

interface RewardLeader {
  userId: string
  handle: string | null
  displayName?: string | null
  avatarUrl?: string | null
  totalRewards: number
  weeklyRewards: number
  tier: string
  tierColor: string
  tierIcon: string
  rank: number
  change: number // Position change from last week
  tradingVolume: number
  winRate: number
}

export function RewardsLeaderboard() {
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "all-time">("weekly")

  // Fetch actual leaderboard from backend - currently returns empty
  const { data: leaders, isLoading } = useQuery<RewardLeader[]>({
    queryKey: ['reward-leaderboard', timeframe],
    queryFn: async (): Promise<RewardLeader[]> => {
      // TODO: Implement backend endpoint /api/rewards/leaderboard
      // For now, return empty array until backend is ready
      return []
    },
  })

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-pipe-400" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0">
            1st Place
          </Badge>
        )
      case 2:
        return (
          <Badge className="bg-gradient-to-r from-pipe-400 to-pipe-500 text-white border-0">
            2nd Place
          </Badge>
        )
      case 3:
        return (
          <Badge className="bg-gradient-to-r from-amber-600 to-orange-600 text-white border-0">
            3rd Place
          </Badge>
        )
      default:
        return null
    }
  }

  const getChangeIndicator = (change: number) => {
    if (change === 0) return null
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-500 text-sm">
          <ArrowUp className="h-3 w-3" />
          <span>{change}</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1 text-red-500 text-sm">
        <ArrowDown className="h-3 w-3" />
        <span>{Math.abs(change)}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mario-card-standard">
        <div className="p-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Leaderboard Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
      <div className="mario-card-standard">
        <div className="mario-header-card mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="mario-title-standard flex items-center gap-2 text-xl">
                <Trophy className="h-5 w-5 text-primary" />
                Top Reward Earners
              </h2>
              <p className="mario-subtitle-standard mt-1">
                The traders earning the most $vSOL tokens
              </p>
            </div>
            <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="all-time">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
      </motion.div>

      {/* Top 3 Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {leaders?.slice(0, 3).map((leader) => (
          <Card key={leader.userId} className={cn(
            "mario-card-standard relative overflow-hidden transition-all hover:shadow-lg hover:scale-105",
            leader.rank === 1 && "border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-transparent",
            leader.rank === 2 && "border-pipe-400/50 bg-gradient-to-br from-pipe-400/5 to-transparent",
            leader.rank === 3 && "border-amber-600/50 bg-gradient-to-br from-amber-600/5 to-transparent"
          )}>
            {leader.rank === 1 && (
              <div className="absolute top-2 right-2">
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>
            )}
            <CardHeader className="mario-header-card mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage
                    src={
                      leader.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(leader.displayName || leader.handle || leader.userId)}&backgroundColor=4f46e5`
                    }
                  />
                  <AvatarFallback className="bg-primary/10">{(leader.displayName || leader.handle || 'U')[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{leader.displayName || leader.handle}</div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", leader.tierColor)}>
                      {leader.tierIcon} {leader.tier}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Weekly Rewards</span>
                  <span className="font-semibold">{formatNumber(leader.weeklyRewards)} $vSOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Earned</span>
                  <span className="font-semibold">{formatNumber(leader.totalRewards)} $vSOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="font-semibold text-green-500">{leader.winRate}%</span>
                </div>
              </div>
              {getRankBadge(leader.rank)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Complete Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaders?.map((leader) => (
              <div key={leader.userId} className={cn(
                "flex items-center justify-between p-4 rounded-lg border border-border/50",
                "hover:bg-muted/50 transition-all hover:shadow-md",
                user?.id === leader.userId && "bg-primary/5 border-primary/30 ring-2 ring-primary/10"
              )}>
                <div className="flex items-center gap-4">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(leader.rank)}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={
                        leader.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(leader.displayName || leader.handle || leader.userId)}&backgroundColor=4f46e5`
                      }
                    />
                    <AvatarFallback className="bg-primary/10">{(leader.displayName || leader.handle || 'U')[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{leader.displayName || leader.handle}</span>
                      {user?.id === leader.userId && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className={cn("font-medium", leader.tierColor)}>
                        {leader.tierIcon} {leader.tier}
                      </span>
                      <span>•</span>
                      <span>{formatUSD(leader.tradingVolume)} volume</span>
                      {getChangeIndicator(leader.change)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatNumber(leader.weeklyRewards)} $vSOL</div>
                  <div className="text-sm text-muted-foreground">This week</div>
                </div>
              </div>
            ))}
          </div>

          {/* Coming Soon Message when no leaders data */}
          {(!leaders || leaders.length === 0) && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-border/50">
                <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Rewards Leaderboard Coming Soon</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Start trading now to prepare for the rewards leaderboard launch.
                  Your trading performance will be tracked and rewarded with $vSOL tokens.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            Leaderboard Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold mb-1">
                {formatNumber(leaders?.reduce((sum, l) => sum + l.weeklyRewards, 0) || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Weekly $vSOL</p>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">
                {formatUSD(leaders?.reduce((sum, l) => sum + l.tradingVolume, 0) || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Combined Volume</p>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">
                {leaders?.[0]?.weeklyRewards ? formatNumber(leaders[0].weeklyRewards) : '0'}
              </div>
              <p className="text-sm text-muted-foreground">Top Reward</p>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">
                {leaders?.length ?
                  (leaders.reduce((sum, l) => sum + l.winRate, 0) / leaders.length).toFixed(1) :
                  '0'
                }%
              </div>
              <p className="text-sm text-muted-foreground">Avg Win Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  )
}