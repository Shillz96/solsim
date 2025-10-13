"use client"

/**
 * Token Position P&L Component (Production Ready - Refactored)
 * 
 * Key improvements:
 * - Uses standardized formatting (formatUSD, safePercent)
 * - All USD values include SOL equivalents via UsdWithSol
 * - Proper empty state for no position
 * - Guards against Infinity%, NaN, undefined
 * - Animated gradient background based on P&L
 * - Real-time P&L calculation with live prices
 * - Loading state with skeleton
 * - Data validation diagnostics
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wallet, TrendingUp, TrendingDown, RefreshCw, AlertCircle, Package } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { usePortfolio } from "@/hooks/use-react-query-hooks"
import { useAuth } from "@/hooks/use-auth"
import * as Backend from "@/lib/types/backend"
import { formatUSD, safePercent, formatTokenQuantity } from "@/lib/format"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface TokenPositionPnLProps {
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
}

/**
 * Animated gradient background based on P&L performance
 */
function AnimatedBackground({ isPositive, hasPosition }: { isPositive: boolean; hasPosition: boolean }) {
  if (!hasPosition) return null
  
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      <motion.div 
        className={cn(
          "absolute inset-0 opacity-10 transition-all duration-1000",
          isPositive 
            ? "bg-gradient-to-br from-green-400 to-green-600" 
            : "bg-gradient-to-br from-red-400 to-red-600"
        )}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  )
}

/**
 * Empty state when no position exists
 */
function NoPositionState({ tokenSymbol, tokenName }: { tokenSymbol?: string; tokenName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">No Position</h3>
      <p className="text-sm text-muted-foreground mb-4">
        You don't have an active position in {tokenSymbol || tokenName || 'this token'}.
      </p>
      
      <p className="text-xs text-muted-foreground">
        Buy some tokens to start tracking P&L here.
      </p>
    </div>
  )
}

/**
 * Loading skeleton
 */
function PnLLoadingSkeleton() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-muted rounded w-32" />
        <div className="h-8 bg-muted rounded w-20" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-6 bg-muted rounded w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Stat row component for displaying metrics
 */
function StatRow({ 
  label, 
  value, 
  showSol = true 
}: { 
  label: string; 
  value: number; 
  showSol?: boolean 
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      {showSol ? (
        <UsdWithSol usd={value} className="text-lg font-semibold" />
      ) : (
        <p className="text-lg font-semibold">{formatUSD(value)}</p>
      )}
    </div>
  )
}

export function TokenPositionPnL({ tokenAddress, tokenSymbol, tokenName }: TokenPositionPnLProps) {
  const { user } = useAuth()
  const { prices } = usePriceStreamContext()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { 
    data: portfolio, 
    isLoading, 
    error,
    refetch 
  } = usePortfolio(user?.id)

  // Data validation diagnostic
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && portfolio) {
      if (!portfolio.positions) console.warn('[TokenPositionPnL] Positions array missing from portfolio');
    }
  }, [portfolio])

  // Find the specific token position
  const tokenPosition = portfolio?.positions?.find((position: Backend.PortfolioPosition) => 
    position.mint === tokenAddress && parseFloat(position.qty) > 0
  )

  // Get live price for this token
  const livePrice = prices.get(tokenAddress)

  // Calculate real-time P&L if we have live price
  const calculateRealTimePnL = () => {
    if (!tokenPosition || !livePrice) return null
    
    const qty = parseFloat(tokenPosition.qty)
    const avgCost = parseFloat(tokenPosition.avgCostUsd)
    const currentValue = qty * livePrice.price
    const costBasis = avgCost * qty
    const unrealizedPnL = currentValue - costBasis
    
    // Guard against division by zero
    const unrealizedPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0
    
    return {
      unrealizedPnL,
      unrealizedPercent,
      currentValue,
      costBasis
    }
  }

  const realTimePnL = calculateRealTimePnL()
  const displayPnL = realTimePnL || {
    unrealizedPnL: tokenPosition ? parseFloat(tokenPosition.unrealizedUsd) : 0,
    unrealizedPercent: tokenPosition ? parseFloat(tokenPosition.unrealizedPercent) : 0,
    currentValue: tokenPosition ? parseFloat(tokenPosition.valueUsd) : 0,
    costBasis: tokenPosition ? parseFloat(tokenPosition.avgCostUsd) * parseFloat(tokenPosition.qty) : 0
  }

  // Guard against invalid values
  const safeUnrealizedPnL = isFinite(displayPnL.unrealizedPnL) ? displayPnL.unrealizedPnL : 0
  const safeCostBasis = isFinite(displayPnL.costBasis) ? displayPnL.costBasis : 0
  const safeCurrentValue = isFinite(displayPnL.currentValue) ? displayPnL.currentValue : 0

  const isPositive = safeUnrealizedPnL >= 0
  const hasPosition = !!tokenPosition
  const PnLIcon = isPositive ? TrendingUp : TrendingDown
  const pnlColor = isPositive ? "text-green-400" : "text-red-400"

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <PnLLoadingSkeleton />
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load position data. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // No position state
  if (!hasPosition) {
    return (
      <Card className="relative overflow-hidden">
        <NoPositionState tokenSymbol={tokenSymbol} tokenName={tokenName} />
      </Card>
    )
  }

  // Calculate percentage for display
  const pnlPercent = safePercent(safeUnrealizedPnL, safeCostBasis)

  return (
    <Card className="relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground isPositive={isPositive} hasPosition={hasPosition} />

      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Position P&L</CardTitle>
            {livePrice && (
              <Badge variant="secondary" className="text-xs">
                Live
              </Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6">
        {/* Main P&L Display */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "p-4 rounded-lg border-2",
            isPositive 
              ? "bg-green-500/5 border-green-500/20" 
              : "bg-red-500/5 border-red-500/20"
          )}
        >
          <div className="flex items-baseline gap-3">
            <PnLIcon className={cn("h-6 w-6", pnlColor)} />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Unrealized P&L</p>
              <UsdWithSol 
                usd={safeUnrealizedPnL} 
                className={cn("text-3xl font-bold", pnlColor)}
              />
              <p className={cn("text-sm mt-1", pnlColor)}>
                {pnlPercent}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <StatRow label="Current Value" value={safeCurrentValue} />
          <StatRow label="Cost Basis" value={safeCostBasis} />
        </div>

        {/* Position Info */}
        {tokenPosition && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">
                {formatTokenQuantity(tokenPosition.qty)} {tokenSymbol || 'tokens'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Avg Entry</span>
              <UsdWithSol 
                usd={parseFloat(tokenPosition.avgCostUsd)} 
                className="font-medium text-sm"
                solClassName="text-xs"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
