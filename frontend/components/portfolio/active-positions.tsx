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
import { useCallback, useState, useEffect } from "react"
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
  
  // Real-time price stream integration
  const { connected: wsConnected, prices: livePrices, subscribe, unsubscribe } = usePriceStreamContext()
  
  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }, [refetch])

  // Extract positions from portfolio data
  const positions = portfolio?.positions?.filter(pos => parseFloat(pos.quantity) > 0) || []

  // Subscribe to price updates for all positions
  useEffect(() => {
    if (positions.length > 0 && wsConnected) {
      positions.forEach(position => {
        subscribe(position.tokenAddress)
      })

      // Cleanup subscriptions on unmount or change
      return () => {
        positions.forEach(position => {
          unsubscribe(position.tokenAddress)
        })
      }
    }
  }, [positions, wsConnected]) // Remove subscribe/unsubscribe to prevent loops

  // Helper to get live price or fallback to stored price
  const getCurrentPrice = (tokenAddress: string, fallbackPrice: number) => {
    const livePrice = livePrices.get(tokenAddress)
    return livePrice ? livePrice.price : fallbackPrice
  }

  // Calculate real-time PnL for a position
  const calculateLivePnL = (position: any) => {
    const currentPrice = getCurrentPrice(position.tokenAddress, position.currentPrice)
    const quantity = parseFloat(position.quantity)
    const entryPrice = parseFloat(position.entryPrice)
    
    const invested = quantity * entryPrice
    const currentValue = quantity * currentPrice
    const pnlAmount = currentValue - invested
    const pnlPercent = invested > 0 ? (pnlAmount / invested) * 100 : 0

    return { pnlAmount, pnlPercent, currentPrice }
  }
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
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Active Positions</h3>
          <Badge variant="secondary" className="font-mono">0 open</Badge>
        </div>
        <div className="text-center py-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No Active Positions</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Start trading to build your portfolio and track your positions here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/trade">
                <TrendingUp className="mr-2 h-4 w-4" />
                Start Trading
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/trending">
                Browse Trending
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
              whileHover={{ scale: 1.01, y: -2 }}
              className={`flex items-center justify-between rounded-lg border border-border bento-card p-4 ${
                wsConnected ? 'ring-1 ring-green-500/20 border-green-500/30' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold font-heading">
                      {position.tokenSymbol || position.tokenAddress.substring(0, 8)}
                    </span>
                    {pnlAmount > 0 ? (
                      <TrendingUp className="h-3 w-3 text-accent" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    {wsConnected && (
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live updates" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {position.tokenName || `${position.tokenAddress.substring(0, 8)}...`}
                  </p>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-mono font-semibold">
                    {formatAmount(position.quantity)}
                  </p>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Entry</p>
                  <p className="font-mono">{formatPrice(entryPrice)}</p>
                </div>

                <div className="text-sm">
                  <p className="text-muted-foreground">Current</p>
                  <p className="font-mono">{formatPrice(currentPrice)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <AnimatedNumber
                    value={pnlAmount}
                    suffix=" SOL"
                    prefix={pnlAmount > 0 ? "+" : ""}
                    decimals={4}
                    className="font-mono text-lg font-bold"
                    colorize={true}
                    glowOnChange={true}
                  />
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

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive opacity-50 hover:opacity-100"
                  onClick={() => {
                    // TODO: Implement position closing functionality
                    import('@/lib/error-logger').then(({ errorLogger }) => {
                      errorLogger.info('Position close requested', {
                        action: 'position_close_requested',
                        metadata: { 
                          tokenAddress: position.tokenAddress.substring(0, 8) + '...',
                          component: 'ActivePositions'
                        }
                      })
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}
