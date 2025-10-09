"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { TrendingUp, Wallet, Activity, AlertCircle, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { SharePnLDialog } from "@/components/modals/share-pnl-dialog"
import { usePortfolio, useBalance, useRecentTrades } from "@/lib/api-hooks"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { WsSubManager } from "@/lib/ws-subscription-delta"
import { memo, useState, useCallback, useEffect, useRef, useMemo } from "react"

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
  const { data: trades, isLoading: tradesLoading, error: tradesError, refetch: refetchTrades } = useRecentTrades(10)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Real-time price stream integration with delta-based subscriptions
  const { connected: wsConnected, prices: livePrices, subscribeMany, unsubscribeMany } = usePriceStreamContext()

  // Memoize token addresses to prevent unnecessary re-subscriptions
  const tokenAddresses = useMemo(
    () => (portfolio?.positions ?? []).map(p => p.tokenAddress),
    [(portfolio?.positions ?? []).map(p => p.tokenAddress).join(',')]
  )

  // Subscribe to price updates for all holdings using delta manager
  // Create manager ref to avoid stale closures
  const wsMgrRef = useRef<WsSubManager | null>(null)
  
  useEffect(() => {
    if (!wsConnected) return

    // Create or update manager with current subscribe/unsubscribe functions
    if (!wsMgrRef.current) {
      wsMgrRef.current = new WsSubManager(subscribeMany, unsubscribeMany)
    }

    wsMgrRef.current.sync(tokenAddresses)

    return () => {
      wsMgrRef.current?.clear()
    }
  }, [wsConnected, tokenAddresses]) // Remove subscribeMany/unsubscribeMany from deps - they're stable from context

  // Enhanced data extraction with live price integration
  const getLivePrice = (tokenAddress: string, fallbackPrice: number) => {
    const livePrice = livePrices.get(tokenAddress)
    return livePrice ? livePrice.price : fallbackPrice
  }

  // Calculate real-time PnL with live prices
  const calculateLivePnL = () => {
    if (!portfolio?.positions) return { totalPnL: 0, totalPnLPercent: 0 }

    let totalCurrentValue = 0
    let totalInvested = 0

    portfolio.positions.forEach(position => {
      const currentPrice = getLivePrice(position.tokenAddress, position.currentPrice)
      const quantity = parseFloat(position.quantity)
      const entryPrice = parseFloat(position.entryPrice)
      
      const invested = quantity * entryPrice
      const currentValue = quantity * currentPrice
      
      totalInvested += invested
      totalCurrentValue += currentValue
    })

    const totalPnL = totalCurrentValue - totalInvested
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

    return { totalPnL, totalPnLPercent }
  }

  const { totalPnL: livePnL, totalPnLPercent: livePnLPercent } = calculateLivePnL()

  // Use live PnL if available and connected, otherwise fall back to API data
  const totalPnLStr = portfolio?.totalPnL?.sol ?? "0"
  const totalPnL = wsConnected && portfolio?.positions?.length ? livePnL : (isNaN(parseFloat(totalPnLStr)) ? 0 : parseFloat(totalPnLStr))
  const totalPnLPercent = wsConnected && portfolio?.positions?.length ? livePnLPercent : (isNaN(portfolio?.totalPnL?.percent ?? 0) ? 0 : portfolio?.totalPnL?.percent ?? 0)
  
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

  // Debug logging moved to useEffect to prevent render loops
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && (portfolio || balance || trades)) {
      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.info('PnLCard data loaded', {
          action: 'pnl_card_data_debug',
          metadata: {
            hasPortfolio: !!portfolio,
            totalPnL,
            totalPnLPercent,
            currentValue,
            totalInvested,
            hasError,
            component: 'PnLCard'
          }
        })
      })
    }
  }, [portfolio, balance, trades]) // Only log when data actually changes

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
    <Card className="trading-card p-6 relative overflow-hidden border border-border rounded-none shadow-none">
      <AnimatedBackground isPositive={totalPnL > 0} />

      <div className={`space-y-6 relative transition-opacity ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold">Total P&L</p>
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
          <div className="flex items-baseline gap-3">
            <AnimatedNumber
              value={totalPnL}
              suffix=" SOL"
              prefix={totalPnL > 0 ? "+" : ""}
              decimals={2}
              className="font-mono text-4xl font-bold"
              colorize={true}
              glowOnChange={true}
            />
            <span className="text-xl font-medium font-mono">
              (
              <AnimatedNumber
                value={totalPnLPercent}
                suffix="%"
                prefix={totalPnLPercent > 0 ? "+" : ""}
                decimals={2}
                className="font-mono"
                colorize={true}
                glowOnChange={true}
              />
              )
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wallet className="h-3 w-3 icon-morph" />
              <span className="text-xs">Balance</span>
            </div>
            <AnimatedNumber
              value={initialBalance}
              suffix=" SOL"
              decimals={4}
              className="font-mono text-sm font-semibold number-display"
              glowOnChange={false}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-xs">💰</span>
              <span className="text-xs">Invested</span>
            </div>
            <AnimatedNumber
              value={totalInvested}
              suffix=" SOL"
              decimals={4}
              className="font-mono text-sm font-semibold number-display"
              glowOnChange={false}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3 icon-morph" />
              <span className="text-xs">Value</span>
            </div>
            <AnimatedNumber
              value={currentValue}
              suffix=" SOL"
              decimals={4}
              className="font-mono text-sm font-semibold number-display"
              colorize={true}
              glowOnChange={true}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3 icon-morph" />
              <span className="text-xs">Trades</span>
            </div>
            <AnimatedNumber
              value={tradesCount}
              decimals={0}
              className="font-mono text-sm font-semibold number-display"
              glowOnChange={false}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
