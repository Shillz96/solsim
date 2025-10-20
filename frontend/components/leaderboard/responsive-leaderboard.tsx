"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { Trophy, TrendingUp, TrendingDown, Minus, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type * as Backend from "@/lib/types/backend"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { UsdWithSol } from "@/lib/sol-equivalent"

interface ResponsiveLeaderboardProps {
  timeRange: "24h" | "7d" | "all"
  currentUserId?: string
  userRowRef?: React.RefObject<HTMLElement | null>
  loading?: boolean
  data?: Backend.LeaderboardEntry[]
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
      <div className="flex items-center justify-center p-12 rounded-lg bg-card border border-border/50">
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
      <div className="flex items-center justify-center p-12 rounded-lg bg-card border border-border/50">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No leaderboard data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-card border border-border/50 overflow-hidden">
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
              const isCurrentUser = entry.userId === currentUserId

              return (
                <tr
                  key={entry.userId}
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
                      {getRankChange(entry.rank, undefined)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      {entry.avatar || entry.avatarUrl || entry.profileImage ? (
                        <img
                          src={entry.avatar || entry.avatarUrl || entry.profileImage || undefined}
                          alt={entry.handle || entry.displayName || 'User'}
                          className="w-8 h-8 rounded-full object-cover border border-border"
                          onError={(e) => {
                            // Fallback to initials on error
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {/* Fallback initials avatar */}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-bold text-xs border border-border",
                          (entry.avatar || entry.avatarUrl || entry.profileImage) && "hidden"
                        )}
                      >
                        {(entry.handle?.[0] || entry.displayName?.[0] || 'A').toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.handle || entry.displayName || 'Anonymous'}</span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                        {entry.rank! <= 3 && <Sparkles className="h-4 w-4 text-yellow-500" />}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <UsdWithSol 
                      usd={parseFloat(entry.totalPnlUsd)}
                      prefix={parseFloat(entry.totalPnlUsd) >= 0 ? '+' : ''}
                      className={`font-bold ${parseFloat(entry.totalPnlUsd) >= 0 ? 'text-profit' : 'text-loss'}`}
                      solClassName="text-xs"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-muted-foreground">{entry.totalTrades}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-muted-foreground">{entry.winRate.toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <UsdWithSol 
                      usd={parseFloat(entry.totalPnlUsd)}
                      className="font-medium font-mono"
                      solClassName="text-xs"
                    />
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
          const isCurrentUser = entry.userId === currentUserId

          return (
            <div
              key={entry.userId}
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
                  {getRankChange(entry.rank, undefined)}
                </div>
                <div className="text-right">
                  <UsdWithSol 
                    usd={parseFloat(entry.totalPnlUsd)}
                    prefix={parseFloat(entry.totalPnlUsd) >= 0 ? '+' : ''}
                    className={`font-bold text-lg ${parseFloat(entry.totalPnlUsd) >= 0 ? 'text-profit' : 'text-loss'}`}
                    solClassName="text-xs"
                  />
                  <p className="text-xs text-muted-foreground">{entry.totalTrades} trades</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {entry.avatar || entry.avatarUrl || entry.profileImage ? (
                    <img
                      src={entry.avatar || entry.avatarUrl || entry.profileImage || undefined}
                      alt={entry.handle || entry.displayName || 'User'}
                      className="w-8 h-8 rounded-full object-cover border border-border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  {/* Fallback initials avatar */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-bold text-xs border border-border",
                      (entry.avatar || entry.avatarUrl || entry.profileImage) && "hidden"
                    )}
                  >
                    {(entry.handle?.[0] || entry.displayName?.[0] || 'A').toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.handle || entry.displayName || 'Anonymous'}</span>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <UsdWithSol 
                    usd={parseFloat(entry.totalPnlUsd)}
                    className="font-mono text-sm"
                    solClassName="text-xs"
                  />
                  <p className="text-xs text-muted-foreground">{entry.winRate.toFixed(1)}% win</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
