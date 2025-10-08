"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { TrendingUp, TrendingDown, X, Loader2, AlertCircle, RefreshCw, Wallet } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePortfolio } from "@/lib/api-hooks"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { WsSubManager } from "@/lib/ws-subscription-delta"
import { useCallback, useState, useEffect, useMemo, useRef } from "react"
import type { PortfolioPosition } from "@/lib/portfolio-service"

// Helper function to format large numbers
const formatAmount = (amount: string): string => {
  const num = parseFloat(amount)
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// Helper function to format price
const formatPrice = (price: number): string => {
  if (price < 0.001) return `$${price.toFixed(6)}`
  if (price < 1) return `$${price.toFixed(4)}`
  return `$${price.toFixed(2)}`
}

export function ActivePositions() {
  const { data: portfolio, isLoading, error, refetch } = usePortfolio()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Real-time price stream integration with delta-based subscriptions
  const { connected: wsConnected, prices: livePrices, subscribeMany, unsubscribeMany } = usePriceStreamContext()
  
  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }, [refetch])

  // Extract positions from portfolio data
  const positions = portfolio?.positions?.filter(pos => parseFloat(pos.quantity) > 0) || []

  // Memoize token addresses to prevent unnecessary re-subscriptions
  const tokenAddresses = useMemo(
    () => positions.map(p => p.tokenAddress),
    [positions.map(p => p.tokenAddress).join(',')]
  )

  // Subscribe to price updates using delta manager
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
  }, [wsConnected, subscribeMany, unsubscribeMany, tokenAddresses])

  // Helper to get live price or fallback to stored price
  const getCurrentPrice = useCallback((tokenAddress: string, fallbackPrice: number) => {
    const livePrice = livePrices.get(tokenAddress)
    return livePrice ? livePrice.price : fallbackPrice
  }, [livePrices])

  // Memoize PnL calculation per position to avoid hot path recalculations
  const calculateLivePnL = useCallback((position: any) => {
    const currentPrice = getCurrentPrice(position.tokenAddress, position.currentPrice)
    const quantity = parseFloat(position.quantity)
    const entryPrice = parseFloat(position.entryPrice)
    
    const invested = quantity * entryPrice
    const currentValue = quantity * currentPrice
    const pnlAmount = currentValue - invested
    const pnlPercent = invested > 0 ? (pnlAmount / invested) * 100 : 0

    return { pnlAmount, pnlPercent, currentPrice }
  }, [getCurrentPrice])
  // Loading state - only show skeleton on initial load
  if (isLoading && !portfolio) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Active Positions</h3>
          <Badge variant="secondary" className="font-mono">...</Badge>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Loading positions...</span>
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Active Positions</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load positions: {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  // Empty state
  if (positions.length === 0) {
    return (
      <Card className="p-8 border-dashed">
        <div className="text-center py-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <h3 className="font-semibold text-xl mb-2">No Active Positions</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Your portfolio is empty. Start trading to build your positions and track your performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/trade">
                <TrendingUp className="h-4 w-4" />
                Start Trading
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/trending">
                Browse Trending Tokens
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="glass-solid p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Active Positions</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            {positions.length} open
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className={`space-y-3 transition-opacity ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
        {positions.map((position) => {
          // Use live PnL calculation if WebSocket is connected
          const { pnlAmount, pnlPercent, currentPrice } = wsConnected 
            ? calculateLivePnL(position)
            : {
                pnlAmount: parseFloat(position.pnl?.sol?.absolute || '0'),
                pnlPercent: position.pnl?.sol?.percent || 0,
                currentPrice: position.currentPrice
              }
          
          const entryPrice = parseFloat(position.entryPrice)
          
          return (
            <motion.div
              key={position.tokenAddress}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="group"
            >
              <Link 
                href={`/trade?token=${position.tokenAddress}`}
                className="block"
              >
                <div className={`flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md ${
                  wsConnected ? 'ring-1 ring-green-500/20' : ''
                }`}>
                  <div className="flex items-center gap-6 flex-1">
                    {/* Token Info */}
                    <div className="min-w-[120px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">
                          {position.tokenSymbol || position.tokenAddress.substring(0, 8)}
                        </span>
                        {wsConnected && (
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="Live" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {position.tokenName || `${position.tokenAddress.substring(0, 12)}...`}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="hidden md:grid md:grid-cols-3 gap-6 flex-1">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Amount</p>
                        <p className="font-mono font-semibold text-sm">
                          {formatAmount(position.quantity)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Entry → Current</p>
                        <p className="font-mono text-sm">
                          {formatPrice(entryPrice)} → {formatPrice(currentPrice)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Value</p>
                        <p className="font-mono font-semibold text-sm">
                          {(parseFloat(position.quantity) * currentPrice).toFixed(4)} SOL
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PnL Display */}
                  <div className="text-right min-w-[140px]">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <AnimatedNumber
                        value={pnlAmount}
                        suffix=" SOL"
                        prefix={pnlAmount > 0 ? "+" : ""}
                        decimals={4}
                        className="font-mono text-base font-bold"
                        colorize={true}
                        glowOnChange={true}
                      />
                      {pnlAmount > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <AnimatedNumber
                      value={pnlPercent}
                      suffix="%"
                      prefix={pnlPercent > 0 ? "+" : ""}
                      decimals={2}
                      className="text-sm font-medium font-mono"
                      colorize={true}
                      glowOnChange={true}
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}
