"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { Trophy, TrendingUp, TrendingDown, Minus, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LeaderboardEntry as APILeaderboardEntry } from "@/lib/leaderboard-service"

interface ResponsiveLeaderboardProps {
  timeRange: "24h" | "7d" | "all"
  currentUserId?: string
  userRowRef?: React.RefObject<HTMLElement | null>
  loading?: boolean
  data?: APILeaderboardEntry[]
}

export function ResponsiveLeaderboard({ 
  timeRange, 
  currentUserId, 
  userRowRef, 
  loading = false,
  data: externalData = []
}: ResponsiveLeaderboardProps) {

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-bold text-xl gradient-text">#{rank}</span>
        </div>
      )
    if (rank === 2)
      return (
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gray-400" />
          <span className="font-bold text-xl">#{rank}</span>
        </div>
      )
    if (rank === 3)
      return (
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange-600" />
          <span className="font-bold text-xl">#{rank}</span>
        </div>
      )
    return <span className="font-bold text-lg">#{rank}</span>
  }

  const getRankChange = (current?: number, previous?: number) => {
    if (!current || !previous || current === previous) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
        </div>
      )
    }
    
    const change = previous - current
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-500">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">+{change}</span>
        </div>
      )
    }
    if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingDown className="h-4 w-4" />
          <span className="text-xs font-medium">{change}</span>
        </div>
      )
    }
    
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Card className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </Card>
    )
  }

  // Empty state
  if (!externalData || externalData.length === 0) {
    return (
      <Card className="flex items-center justify-center p-12">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No leaderboard data available</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="glass-solid overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold">Rank</th>
              <th className="px-6 py-4 text-left text-sm font-semibold">Trader</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Total PnL</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Trades</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Win Rate</th>
              <th className="px-6 py-4 text-right text-sm font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {externalData.map((entry) => {
              const isCurrentUser = entry.id === currentUserId

              return (
                <tr
                  key={entry.id}
                  ref={isCurrentUser ? userRowRef as React.RefObject<HTMLTableRowElement | null> : undefined}
                  className={cn(
                    "hover:bg-muted/30 transition-all duration-300",
                    isCurrentUser && "bg-primary/10 border-l-4 border-l-primary",
                    entry.rank! <= 3 && "bg-gradient-to-r from-primary/5 to-transparent",
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {getRankBadge(entry.rank!)}
                      {getRankChange(entry.rank, entry.previousRank)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.username}</span>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                      {entry.rank! <= 3 && <Sparkles className="h-4 w-4 text-yellow-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <AnimatedNumber
                      value={entry.totalPnL}
                      suffix=" SOL"
                      prefix={entry.totalPnL >= 0 ? '+' : ''}
                      decimals={2}
                      className="font-bold"
                      colorize={true}
                      glowOnChange={true}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-muted-foreground">{entry.totalTrades}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-muted-foreground">{entry.winRate.toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium font-mono">{entry.balance.toFixed(2)} SOL</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden divide-y divide-border">
        {externalData.map((entry) => {
          const isCurrentUser = entry.id === currentUserId

          return (
            <div
              key={entry.id}
              ref={isCurrentUser ? userRowRef as React.RefObject<HTMLDivElement | null> : undefined}
              className={cn(
                "p-4 transition-all duration-300",
                isCurrentUser && "bg-primary/10 border-l-4 border-l-primary",
                entry.rank! <= 3 && "bg-gradient-to-r from-primary/5 to-transparent",
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getRankBadge(entry.rank!)}
                  {getRankChange(entry.rank, entry.previousRank)}
                </div>
                <div className="text-right">
                  <AnimatedNumber
                    value={entry.totalPnL}
                    suffix=" SOL"
                    prefix={entry.totalPnL >= 0 ? '+' : ''}
                    decimals={2}
                    className="font-bold text-lg"
                    colorize={true}
                    glowOnChange={true}
                  />
                  <p className="text-xs text-muted-foreground">{entry.totalTrades} trades</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{entry.username}</span>
                  {isCurrentUser && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{entry.balance.toFixed(2)} SOL</p>
                  <p className="text-xs text-muted-foreground">{entry.winRate.toFixed(1)}% win</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
