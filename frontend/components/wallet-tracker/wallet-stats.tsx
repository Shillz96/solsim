"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Loader2
} from "lucide-react"
import { formatUSD, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

interface WalletStatsProps {
  trackedWallets: any[]
  activities: any[]
  isLoading?: boolean
  timeWindowHours?: number
}

export function WalletStats({
  trackedWallets,
  activities,
  isLoading = false,
  timeWindowHours = 24
}: WalletStatsProps) {
  // Calculate stats with useMemo for real-time updates
  const stats = useMemo(() => {
    const totalWallets = trackedWallets.length

    // Filter activities by time window
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000
    const now = new Date().getTime()

    const timeFilteredActivities = activities.filter(a => {
      const activityTime = new Date(a.timestamp).getTime()
      return (now - activityTime) <= timeWindowMs
    })

    const totalActivities = timeFilteredActivities.length

    const totalVolume = timeFilteredActivities
      .reduce((sum, a) => sum + (parseFloat(a.priceUsd || '0')), 0)

    const buyCount = activities.filter(a => a.type === 'BUY').length
    const sellCount = activities.filter(a => a.type === 'SELL').length

    // Handle division by zero for ratio
    const ratioValue = buyCount === 0 && sellCount === 0 ? "N/A" : `${buyCount}/${sellCount}`
    const isPositive = buyCount > sellCount

    return [
      {
        label: "Tracked Wallets",
        value: totalWallets,
        icon: Wallet,
        color: "text-[var(--mario-red)]",
        bgColor: "bg-[var(--mario-red)]/10",
        srText: "Number of tracked wallets"
      },
      {
        label: `${timeWindowHours}h Activities`,
        value: totalActivities,
        icon: Activity,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        srText: `Activities in the last ${timeWindowHours} hours`
      },
      {
        label: `${timeWindowHours}h Volume`,
        value: formatNumber(totalVolume), // Remove $ symbol - redundant with label
        icon: DollarSign,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        srText: `Trading volume in the last ${timeWindowHours} hours`
      },
      {
        label: "Buy/Sell Ratio",
        value: ratioValue,
        icon: buyCount > sellCount ? TrendingUp : TrendingDown,
        color: isPositive ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]",
        bgColor: isPositive ? "bg-[var(--luigi-green)]/10" : "bg-[var(--mario-red)]/10",
        srText: isPositive ? "More buy activity" : "More sell activity"
      }
    ]
  }, [trackedWallets, activities, timeWindowHours])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="mario-card bg-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="h-3 bg-[var(--pipe-200)] rounded animate-pulse" />
                <div className="h-6 bg-[var(--pipe-300)] rounded animate-pulse w-16" />
              </div>
              <div className="p-2 rounded-lg border-2 border-[var(--outline-black)] bg-[var(--pipe-100)]">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--pipe-600)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[4px_4px_0_var(--outline-black)] p-4 transition-transform hover:scale-105 hover:shadow-[6px_6px_0_var(--outline-black)] cursor-default"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[var(--outline-black)]">{stat.label}</p>
              <p className="text-xl font-bold text-[var(--outline-black)]">{stat.value}</p>
            </div>
            <div className="bg-[var(--sky-blue)] border-2 border-[var(--outline-black)] rounded-lg p-2">
              <stat.icon className="h-5 w-5 text-[var(--outline-black)]" />
              <span className="sr-only">{stat.srText}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}