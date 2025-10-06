"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, X, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { usePortfolio } from "@/lib/api-hooks-v2"
import { useCallback, useState } from "react"
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
  
  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }, [refetch])

  // Extract positions from portfolio data
  const positions = portfolio?.positions?.filter(pos => parseFloat(pos.quantity) > 0) || []
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
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No active positions</p>
          <p className="text-xs mt-1">Make your first trade to see positions here</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
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
          const pnlAmount = parseFloat(position.pnl.sol.absolute)
          const pnlPercent = position.pnl.sol.percent
          const entryPrice = parseFloat(position.entryPrice)
          
          return (
            <motion.div
              key={position.tokenAddress}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
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
                  <p className="font-mono">{formatPrice(position.currentPrice)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`font-mono text-lg font-bold ${pnlAmount > 0 ? "text-accent" : "text-destructive"}`}>
                    {pnlAmount > 0 ? "+" : ""}
                    {pnlAmount.toFixed(4)} SOL
                  </p>
                  <p className={`text-sm font-medium font-mono ${pnlAmount > 0 ? "text-accent" : "text-destructive"}`}>
                    {pnlPercent > 0 ? "+" : ""}
                    {pnlPercent.toFixed(2)}%
                  </p>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive opacity-50 hover:opacity-100"
                  onClick={() => {
                    // TODO: Implement position closing functionality
                    console.log('Close position:', position.tokenAddress)
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
