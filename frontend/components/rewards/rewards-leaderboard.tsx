"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
  username: string
  avatar?: string
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

// Mock data for demonstration - replace with actual API call
const mockLeaders: RewardLeader[] = [
  {
    userId: "1",
    username: "CryptoKing",
    totalRewards: 125000,
    weeklyRewards: 8500,
    tier: "Diamond",
    tierColor: "text-cyan-500",
    tierIcon: "💎",
    rank: 1,
    change: 0,
    tradingVolume: 2500000,
    winRate: 68.5
  },
  {
    userId: "2",
    username: "MoonTrader",
    totalRewards: 98000,
    weeklyRewards: 7200,
    tier: "Diamond",
    tierColor: "text-cyan-500",
    tierIcon: "💎",
    rank: 2,
    change: 2,
    tradingVolume: 1850000,
    winRate: 65.2
  },
  {
    userId: "3",
    username: "SolanaWhale",
    totalRewards: 87500,
    weeklyRewards: 6800,
    tier: "Platinum",
    tierColor: "text-purple-500",
    tierIcon: "🔮",
    rank: 3,
    change: -1,
    tradingVolume: 950000,
    winRate: 62.8
  },
  {
    userId: "4",
    username: "DeFiDegen",
    totalRewards: 76000,
    weeklyRewards: 5500,
    tier: "Platinum",
    tierColor: "text-purple-500",
    tierIcon: "🔮",
    rank: 4,
    change: 3,
    tradingVolume: 780000,
    winRate: 59.4
  },
  {
    userId: "5",
    username: "PumpChaser",
    totalRewards: 65000,
    weeklyRewards: 4800,
    tier: "Gold",
    tierColor: "text-yellow-500",
    tierIcon: "🏆",
    rank: 5,
    change: -2,
    tradingVolume: 450000,
    winRate: 57.1
  }
]

export function RewardsLeaderboard() {
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "all-time">("weekly")

  // In a real app, this would fetch from the backend
  const { data: leaders, isLoading } = useQuery({
    queryKey: ['reward-leaderboard', timeframe],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      return mockLeaders
    },
  })

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
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
          <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0">
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
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Leaderboard Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top Reward Earners
              </CardTitle>
              <CardDescription>
                The traders earning the most $SIM tokens
              </CardDescription>
            </div>
            <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
              <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="all-time">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
      </Card>

      {/* Top 3 Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {leaders?.slice(0, 3).map((leader) => (
          <Card key={leader.userId} className={cn(
            "relative overflow-hidden",
            leader.rank === 1 && "border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-transparent"
          )}>
            {leader.rank === 1 && (
              <div className="absolute top-2 right-2">
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={leader.avatar} />
                  <AvatarFallback>{leader.username[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{leader.username}</div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm", leader.tierColor)}>
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
                  <span className="font-semibold">{formatNumber(leader.weeklyRewards)} $SIM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Earned</span>
                  <span className="font-semibold">{formatNumber(leader.totalRewards)} $SIM</span>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Complete Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leaders?.map((leader) => (
              <div key={leader.userId} className={cn(
                "flex items-center justify-between p-4 rounded-lg border",
                "hover:bg-muted/50 transition-colors",
                user?.id === leader.userId && "bg-primary/5 border-primary/20"
              )}>
                <div className="flex items-center gap-4">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(leader.rank)}
                  </div>
                  <Avatar>
                    <AvatarImage src={leader.avatar} />
                    <AvatarFallback>{leader.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{leader.username}</span>
                      {user?.id === leader.userId && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className={cn(leader.tierColor)}>
                        {leader.tierIcon} {leader.tier}
                      </span>
                      <span>•</span>
                      <span>{formatUSD(leader.tradingVolume)} volume</span>
                      {getChangeIndicator(leader.change)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatNumber(leader.weeklyRewards)} $SIM</div>
                  <div className="text-sm text-muted-foreground">This week</div>
                </div>
              </div>
            ))}
          </div>

          {/* Your Position (if not in top 5) */}
          {user && !leaders?.find(l => l.userId === user.id) && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="w-8 flex justify-center">
                    <span className="text-sm font-semibold">#{Math.floor(Math.random() * 50 + 6)}</span>
                  </div>
                  <Avatar>
                    <AvatarFallback>{user.username?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{user.username || 'You'}</span>
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Keep trading to climb the ranks!
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">0 $SIM</div>
                  <div className="text-sm text-muted-foreground">This week</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Leaderboard Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(leaders?.reduce((sum, l) => sum + l.weeklyRewards, 0) || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Weekly $SIM</p>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatUSD(leaders?.reduce((sum, l) => sum + l.tradingVolume, 0) || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Combined Volume</p>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {leaders?.[0]?.weeklyRewards ? formatNumber(leaders[0].weeklyRewards) : '0'}
              </div>
              <p className="text-sm text-muted-foreground">Top Reward</p>
            </div>
            <div>
              <div className="text-2xl font-bold">
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
    </div>
  )
}