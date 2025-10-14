"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign
} from "lucide-react"
import { formatUSD, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

interface WalletStatsProps {
  trackedWallets: any[]
  activities: any[]
}

export function WalletStats({ trackedWallets, activities }: WalletStatsProps) {
  // Calculate stats
  const totalWallets = trackedWallets.length
  const totalActivities24h = activities.filter(a => {
    const activityTime = new Date(a.timestamp)
    const now = new Date()
    const hoursDiff = (now.getTime() - activityTime.getTime()) / (1000 * 60 * 60)
    return hoursDiff <= 24
  }).length

  const totalVolume24h = activities
    .filter(a => {
      const activityTime = new Date(a.timestamp)
      const now = new Date()
      const hoursDiff = (now.getTime() - activityTime.getTime()) / (1000 * 60 * 60)
      return hoursDiff <= 24
    })
    .reduce((sum, a) => sum + (parseFloat(a.priceUsd || '0')), 0)

  const buyCount = activities.filter(a => a.type === 'BUY').length
  const sellCount = activities.filter(a => a.type === 'SELL').length

  const stats = [
    {
      label: "Tracked Wallets",
      value: totalWallets,
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      label: "24h Activities",
      value: totalActivities24h,
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "24h Volume",
      value: formatUSD(totalVolume24h),
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Buy/Sell Ratio",
      value: `${buyCount}/${sellCount}`,
      icon: buyCount > sellCount ? TrendingUp : TrendingDown,
      color: buyCount > sellCount ? "text-green-500" : "text-red-500",
      bgColor: buyCount > sellCount ? "bg-green-500/10" : "bg-red-500/10"
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-semibold">{stat.value}</p>
            </div>
            <div className={cn(
              "p-2 rounded-lg",
              stat.bgColor
            )}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}