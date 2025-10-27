"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  BarChart3,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio } from "@/hooks/use-portfolio"
import { formatUSD, safePercent } from "@/lib/format"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'danger' | 'neutral'
}

function StatCard({ label, value, subtitle, icon: Icon, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'border-primary/20 bg-primary/5',
    success: 'border-green-500/20 bg-green-500/5',
    danger: 'border-red-500/20 bg-red-500/5',
    neutral: 'border-border bg-muted/30'
  }

  const iconStyles = {
    default: 'text-primary',
    success: 'text-profit',
    danger: 'text-loss',
    neutral: 'text-muted-foreground'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className={cn("p-4 border-2", variantStyles[variant])}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-2 rounded-[14px] bg-background/50", iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export function TradingStatsSummary() {
  const { user } = useAuth()

  // Use centralized portfolio hook
  const {
    data: portfolioData,
    isLoading,
    error,
    refetch
  } = usePortfolio()

  const totals = portfolioData?.totals

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading trading stats...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium">Failed to load stats</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(error as Error).message}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  if (!totals) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 bg-muted rounded-full">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">No Trading History</h3>
            <p className="text-sm text-muted-foreground">
              Start trading to see your statistics here
            </p>
          </div>
          <Button onClick={() => window.location.href = '/warp-pipes'} className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Start Trading
          </Button>
        </div>
      </Card>
    )
  }

  // Extract values from totals
  const totalPnl = parseFloat(totals.totalPnlUsd)
  const totalRealized = parseFloat(totals.totalRealizedUsd)
  const totalUnrealized = parseFloat(totals.totalUnrealizedUsd)
  const winRate = parseFloat(totals.winRate)
  const totalTrades = totals.totalTrades
  const winningTrades = totals.winningTrades
  const losingTrades = totals.losingTrades

  // Determine overall P&L variant
  const pnlVariant = totalPnl > 0 ? 'success' : totalPnl < 0 ? 'danger' : 'neutral'

  // Calculate average trade size
  const avgTradeSize = totalTrades > 0 ? totalPnl / totalTrades : 0

  return (
    <div className="space-y-6 mt-6">
      {/* Simplified Performance Breakdown */}
      <Card className="p-6 bg-gradient-to-br from-muted/20 to-background border-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg">Performance Breakdown</h4>
            <Button size="sm" variant="ghost" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Winning Trades</span>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
                    {winningTrades}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Losing Trades</span>
                <Badge variant="outline" className="border-red-500/30 text-red-500">
                  {losingTrades}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg per Trade</span>
                <span className={cn(
                  "font-mono font-semibold text-sm",
                  avgTradeSize >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {formatUSD(avgTradeSize)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Win Rate</span>
                <span className={cn(
                  "font-mono font-semibold text-sm",
                  winRate >= 50 ? "text-green-500" : "text-muted-foreground"
                )}>
                  {winRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
