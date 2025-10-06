"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Wallet, Activity } from "lucide-react"
import { motion } from "framer-motion"
import { SharePnLDialog } from "@/components/modals/share-pnl-dialog"
import { usePortfolio, useBalance, useRecentTrades } from "@/lib/api-hooks-v2"
import { memo } from "react"

const AnimatedBackground = memo(({ isPositive }: { isPositive: boolean }) => {
  return (
    <motion.div
      className="absolute inset-0 opacity-5"
      style={{ willChange: "background" }}
      animate={{
        background: isPositive
          ? [
              "radial-gradient(circle at 0% 0%, oklch(0.70 0.20 180) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, oklch(0.70 0.20 180) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, oklch(0.70 0.20 180) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, oklch(0.70 0.20 180) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, oklch(0.70 0.20 180) 0%, transparent 50%)",
            ]
          : [
              "radial-gradient(circle at 0% 0%, oklch(0.55 0.25 25) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, oklch(0.55 0.25 25) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, oklch(0.55 0.25 25) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, oklch(0.55 0.25 25) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, oklch(0.55 0.25 25) 0%, transparent 50%)",
            ],
      }}
      transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
    />
  )
})

AnimatedBackground.displayName = "AnimatedBackground"

export function PnLCard() {
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio()
  const { data: balance, isLoading: balanceLoading } = useBalance()
  const { data: trades, isLoading: tradesLoading } = useRecentTrades()

  // Extract real data from API responses
  const totalPnLStr = portfolio?.totalPnL?.sol ?? "0"
  const totalPnL = parseFloat(totalPnLStr)
  const totalPnLPercent = portfolio?.totalPnL?.percent ?? 0
  const currentValueStr = portfolio?.totalValue?.sol ?? "0" 
  const currentValue = parseFloat(currentValueStr)
  const initialBalanceStr = balance ?? "0"
  const initialBalance = parseFloat(initialBalanceStr)
  const tradesCount = trades?.length ?? 0

  // Show loading state if any data is still loading
  if (portfolioLoading || balanceLoading || tradesLoading) {
    return (
      <Card className="p-6 relative overflow-hidden">
        <div className="space-y-6 relative">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total P&L</p>
          </div>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 relative overflow-hidden">
      <AnimatedBackground isPositive={totalPnL > 0} />

      <div className="space-y-6 relative">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Total P&L</p>
          <SharePnLDialog
            totalPnL={totalPnL}
            totalPnLPercent={totalPnLPercent}
            currentValue={currentValue}
            initialBalance={initialBalance}
          />
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-3xl font-bold ${totalPnL > 0 ? "text-accent" : "text-destructive"}`}>
              {totalPnL > 0 ? "+" : ""}
              {totalPnL.toFixed(2)} SOL
            </span>
            <span className={`text-lg font-medium font-mono ${totalPnL > 0 ? "text-accent" : "text-destructive"}`}>
              ({totalPnL > 0 ? "+" : ""}
              {totalPnLPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wallet className="h-3 w-3" />
              <span className="text-xs">Balance</span>
            </div>
            <p className="font-mono text-sm font-semibold">{initialBalance.toFixed(2)} SOL</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Total Value</span>
            </div>
            <p className="font-mono text-sm font-semibold">{currentValue.toFixed(2)} SOL</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span className="text-xs">Trades</span>
            </div>
            <p className="font-mono text-sm font-semibold">{tradesCount}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
