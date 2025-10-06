"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, Wallet, Activity, AlertCircle, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { SharePnLDialog } from "@/components/modals/share-pnl-dialog"
import { usePortfolio, useBalance, useRecentTrades } from "@/lib/api-hooks-v2"
import { memo, useState, useCallback } from "react"

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
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError, refetch: refetchPortfolio } = usePortfolio()
  const { data: balance, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useBalance()
  const { data: trades, isLoading: tradesLoading, error: tradesError, refetch: refetchTrades } = useRecentTrades()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Enhanced data extraction with proper validation and fallbacks
  const totalPnLStr = portfolio?.totalPnL?.sol ?? "0"
  const totalPnL = isNaN(parseFloat(totalPnLStr)) ? 0 : parseFloat(totalPnLStr)
  const totalPnLPercent = isNaN(portfolio?.totalPnL?.percent) ? 0 : portfolio?.totalPnL?.percent ?? 0
  
  const currentValueStr = portfolio?.totalValue?.sol ?? "0" 
  const currentValue = isNaN(parseFloat(currentValueStr)) ? 0 : parseFloat(currentValueStr)
  
  const totalInvestedStr = portfolio?.totalInvested?.sol ?? "0"
  const totalInvested = isNaN(parseFloat(totalInvestedStr)) ? 0 : parseFloat(totalInvestedStr)
  
  const initialBalanceStr = balance ?? "0"
  const initialBalance = isNaN(parseFloat(initialBalanceStr)) ? 0 : parseFloat(initialBalanceStr)
  
  const tradesCount = trades?.length ?? 0
  
  const hasError = portfolioError || balanceError || tradesError
  const isLoading = portfolioLoading || balanceLoading || tradesLoading
  
  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await Promise.all([
      refetchPortfolio(),
      refetchBalance(),
      refetchTrades()
    ])
    setIsRefreshing(false)
  }, [refetchPortfolio, refetchBalance, refetchTrades])

  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('PnLCard data:', {
      portfolio,
      totalPnL,
      totalPnLPercent,
      currentValue,
      totalInvested,
      hasError,
      errors: { portfolioError, balanceError, tradesError }
    })
  }

  // Show loading state only on initial load
  if (isLoading && !portfolio && !balance && !trades) {
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

  // Show error state if any data failed to load
  if (hasError) {
    return (
      <Card className="p-6 relative overflow-hidden">
        <div className="space-y-4 relative">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total P&L</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                refetchPortfolio()
                refetchBalance()
                refetchTrades()
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load P&L data. Please try refreshing.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 relative overflow-hidden">
      <AnimatedBackground isPositive={totalPnL > 0} />

      <div className={`space-y-6 relative transition-opacity ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Total P&L</p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <SharePnLDialog
              totalPnL={totalPnL}
              totalPnLPercent={totalPnLPercent}
              currentValue={currentValue}
              initialBalance={initialBalance}
            />
          </div>
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

        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wallet className="h-3 w-3" />
              <span className="text-xs">Balance</span>
            </div>
            <p className="font-mono text-sm font-semibold">{initialBalance.toFixed(4)} SOL</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-xs">💰</span>
              <span className="text-xs">Invested</span>
            </div>
            <p className="font-mono text-sm font-semibold">{totalInvested.toFixed(4)} SOL</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Value</span>
            </div>
            <p className="font-mono text-sm font-semibold">{currentValue.toFixed(4)} SOL</p>
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
