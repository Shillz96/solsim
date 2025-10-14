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
          <div className={cn("p-2 rounded-lg bg-background/50", iconStyles[variant])}>
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
          <Button onClick={() => window.location.href = '/trade'} className="gap-2">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Trading Statistics</h3>
          <p className="text-sm text-muted-foreground">Your overall trading performance</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total P&L"
          value={formatUSD(totalPnl)}
          subtitle={`${totalPnl >= 0 ? 'Profit' : 'Loss'}`}
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          variant={pnlVariant}
        />

        <StatCard
          label="Total Trades"
          value={totalTrades.toLocaleString()}
          subtitle={`${winningTrades} wins, ${losingTrades} losses`}
          icon={BarChart3}
          variant="neutral"
        />

        <StatCard
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          subtitle={winRate >= 50 ? 'Above average' : 'Room to improve'}
          icon={Target}
          variant={winRate >= 50 ? 'success' : winRate >= 40 ? 'neutral' : 'danger'}
        />

        <StatCard
          label="Realized P&L"
          value={formatUSD(totalRealized)}
          subtitle="Closed positions"
          icon={Award}
          variant={totalRealized >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Additional Insights */}
      <Card className="p-6 bg-gradient-to-br from-muted/30 to-muted/10 border-2">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Performance Insights</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Winning Trades:</span>
                <Badge variant={winningTrades > losingTrades ? "default" : "secondary"}>
                  {winningTrades}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Losing Trades:</span>
                <Badge variant={losingTrades < winningTrades ? "secondary" : "outline"}>
                  {losingTrades}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Unrealized P&L:</span>
                <span className={cn(
                  "font-mono font-semibold",
                  totalUnrealized >= 0 ? "text-profit" : "text-loss"
                )}>
                  {formatUSD(totalUnrealized)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Average per Trade:</span>
                <span className="font-mono font-semibold">
                  {formatUSD(totalTrades > 0 ? totalPnl / totalTrades : 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
