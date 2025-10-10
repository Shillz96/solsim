"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wallet, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { usePortfolio } from "@/hooks/use-react-query-hooks"
import { useAuth } from "@/hooks/use-auth"
import * as Backend from "@/lib/types/backend"
import { cn } from "@/lib/utils"

interface TokenPositionPnLProps {
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
}

interface AnimatedBackgroundProps {
  isPositive: boolean
  hasPosition: boolean
}

function AnimatedBackground({ isPositive, hasPosition }: AnimatedBackgroundProps) {
  if (!hasPosition) return null
  
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      <div 
        className={cn(
          "absolute inset-0 opacity-5 transition-all duration-1000",
          isPositive ? "bg-gradient-to-br from-green-400 to-green-600" : "bg-gradient-to-br from-red-400 to-red-600"
        )}
      />
      <div 
        className={cn(
          "absolute inset-0 opacity-10 transition-all duration-1000",
          isPositive 
            ? "bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.3),transparent_50%)]"
            : "bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.3),transparent_50%)]"
        )}
      />
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

  // Find the specific token position
  const tokenPosition = portfolio?.positions?.find((position: Backend.PortfolioPosition) => 
    position.mint === tokenAddress && parseFloat(position.qty) > 0
  )

  // Get live price for this token
  const livePrice = prices.get(tokenAddress)

  // Calculate real-time P&L if we have live price
  const calculateRealTimePnL = () => {
    if (!tokenPosition || !livePrice) return null
    
    const currentValue = parseFloat(tokenPosition.qty) * livePrice.price
    const costBasis = parseFloat(tokenPosition.avgCostUsd) * parseFloat(tokenPosition.qty)
    const unrealizedPnL = currentValue - costBasis
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

  const isPositive = displayPnL.unrealizedPnL >= 0
  const hasPosition = !!tokenPosition

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <div className="p-6 text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground animate-spin mb-4" />
          <h3 className="text-lg font-medium">Loading Position...</h3>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="relative overflow-hidden">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load position data.
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                className="ml-2"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    )
  }

  if (!hasPosition) {
    return (
      <Card className="relative overflow-hidden">
        <div className="p-6 text-center">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Position</h3>
          <p className="text-muted-foreground mb-4">
            You don't hold any {tokenSymbol || 'tokens'} yet
          </p>
          <Badge variant="outline">Start trading to build a position</Badge>
        </div>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <AnimatedBackground isPositive={isPositive} hasPosition={hasPosition} />
      
      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Position P&L</CardTitle>
              <p className="text-sm text-muted-foreground">
                {tokenSymbol || tokenName || 'Token'} Holdings
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 pt-2">
        {/* Main P&L Display */}
        <div className="text-center mb-6">
          <div className="mb-2">
            <div className={`text-3xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}
              <AnimatedNumber 
                value={Math.abs(displayPnL.unrealizedPnL)} 
                prefix="$" 
                decimals={2}
              />
            </div>
            <div className={`text-lg font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}<AnimatedNumber value={displayPnL.unrealizedPercent} suffix="%" decimals={2} />
            </div>
          </div>
          
          {realTimePnL && (
            <Badge variant="outline" className="text-xs">
              Live Price {livePrice ? `$${livePrice.price.toFixed(6)}` : ''}
            </Badge>
          )}
        </div>

        {/* Position Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Holdings</p>
            <p className="font-mono font-semibold">
              <AnimatedNumber 
                value={parseFloat(tokenPosition.qty)} 
                decimals={2}
                className="text-sm"
              />
            </p>
            <p className="text-xs text-muted-foreground">{tokenSymbol || 'tokens'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Avg. Cost</p>
            <p className="font-mono font-semibold text-sm">
              $<AnimatedNumber 
                value={parseFloat(tokenPosition.avgCostUsd)} 
                decimals={6}
              />
            </p>
          </div>
        </div>

        {/* Value Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Value</span>
            <span className="font-mono">
              $<AnimatedNumber value={displayPnL.currentValue} decimals={2} />
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost Basis</span>
            <span className="font-mono">
              $<AnimatedNumber value={displayPnL.costBasis} decimals={2} />
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground font-medium">P&L</span>
            <span className={`font-mono font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}$<AnimatedNumber value={Math.abs(displayPnL.unrealizedPnL)} decimals={2} />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}