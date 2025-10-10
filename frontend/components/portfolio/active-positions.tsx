"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw, Wallet } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useTokenMetadataBatch } from "@/hooks/use-token-metadata"
import { useCallback, useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { useAuth } from "@/hooks/use-auth"

// Enhanced position with live price data for display
interface EnhancedPosition extends Backend.PortfolioPosition {
  tokenSymbol?: string;
  tokenName?: string;
  tokenImage?: string | null;  // Consistent field name
  currentPrice?: number;
}

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
  const { user, isAuthenticated } = useAuth()
  
  // Use React Query to fetch portfolio data directly
  const { 
    data: portfolio, 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      return api.getPortfolio(user.id)
    },
    enabled: isAuthenticated && !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })

  // Real-time price stream integration
  const { connected: wsConnected, prices: livePrices, subscribeMany, unsubscribeMany } = usePriceStreamContext()
  
  // Subscribe to price updates for all positions
  useEffect(() => {
    if (portfolio?.positions && wsConnected) {
      const mints = portfolio.positions.map(p => p.mint)
      subscribeMany(mints)
      
      return () => {
        unsubscribeMany(mints)
      }
    }
  }, [portfolio?.positions, wsConnected, subscribeMany, unsubscribeMany])

  // Get all mints for metadata fetching
  const mints = useMemo(() => 
    portfolio?.positions?.map(p => p.mint) || [], 
    [portfolio?.positions]
  )

  // Fetch token metadata for all positions
  const { data: metadataResults } = useTokenMetadataBatch(mints, mints.length > 0)

  // Create metadata map for quick lookup
  const metadataMap = useMemo(() => {
    const map = new Map()
    metadataResults?.forEach(result => {
      if (result.data) {
        map.set(result.mint, result.data)
      }
    })
    return map
  }, [metadataResults])

  // Enhance positions with live prices and token metadata
  const enhancedPositions = useMemo(() => {
    if (!portfolio?.positions) return []
    
    return portfolio.positions.map(position => {
      const livePrice = livePrices.get(position.mint)
      const positionValue = parseFloat(position.valueUsd)
      const positionQty = parseFloat(position.qty)
      const currentPrice = livePrice?.price || (positionQty > 0 ? positionValue / positionQty : 0)
      const metadata = metadataMap.get(position.mint)
      
      return {
        ...position,
        currentPrice,
        tokenSymbol: metadata?.symbol || position.mint.slice(0, 6) + '...',
        tokenName: metadata?.name || `Token ${position.mint.slice(0, 8)}`,
        tokenImage: metadata?.imageUrl || metadata?.logoURI || null,
      }
    })
  }, [portfolio?.positions, livePrices, metadataMap])

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading portfolio...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load portfolio: {error instanceof Error ? error.message : 'Unknown error'}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Active Positions</h3>
          <p className="text-muted-foreground">
            Start trading to see your positions here
          </p>
          <Link href="/trade">
            <Button className="mt-4">Start Trading</Button>
          </Link>
        </div>
      </Card>
    )
  }

  const totalValue = parseFloat(portfolio.totals.totalValueUsd)
  const totalPnL = parseFloat(portfolio.totals.totalPnlUsd)
  const unrealizedPnL = parseFloat(portfolio.totals.totalUnrealizedUsd)
  const realizedPnL = parseFloat(portfolio.totals.totalRealizedUsd)
  const totalPnLPercent = totalValue > 0 ? (totalPnL / totalValue) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Active Positions</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">
              <AnimatedNumber value={totalValue} prefix="$" decimals={2} />
            </p>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Total PnL</p>
            <div className="flex items-center justify-center space-x-1">
              {totalPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                <AnimatedNumber 
                  value={Math.abs(totalPnL)} 
                  prefix={totalPnL >= 0 ? '+$' : '-$'} 
                  decimals={2}
                />
              </p>
            </div>
            <p className={`text-sm ${totalPnLPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
            </p>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Positions</p>
            <p className="text-2xl font-bold">{portfolio.positions.length}</p>
          </div>
        </div>

        {/* PnL Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Realized PnL</p>
            <p className={`text-lg font-semibold ${realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(2)}
            </p>
          </div>
          
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Unrealized PnL</p>
            <p className={`text-lg font-semibold ${unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {/* Positions Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Holdings</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Token</th>
                <th className="text-right p-2">Quantity</th>
                <th className="text-right p-2">Avg Cost</th>
                <th className="text-right p-2">Current Value</th>
                <th className="text-right p-2">PnL</th>
                <th className="text-right p-2">PnL %</th>
              </tr>
            </thead>
            <tbody>
              {enhancedPositions.map((position, index) => {
                const pnl = parseFloat(position.unrealizedUsd)
                const pnlPercent = parseFloat(position.unrealizedPercent)
                
                return (
                  <motion.tr
                    key={position.mint}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {position.tokenSymbol?.slice(0, 2) || '??'}
                        </div>
                        <div>
                          <p className="font-medium">{position.tokenSymbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {position.mint.slice(0, 6)}...{position.mint.slice(-4)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right p-2">
                      {formatAmount(position.qty)}
                    </td>
                    <td className="text-right p-2">
                      ${parseFloat(position.avgCostUsd).toFixed(6)}
                    </td>
                    <td className="text-right p-2 font-medium">
                      ${formatAmount(position.valueUsd)}
                    </td>
                    <td className={`text-right p-2 font-medium ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </td>
                    <td className="text-right p-2">
                      <Badge 
                        variant={pnlPercent >= 0 ? "default" : "destructive"}
                        className={pnlPercent >= 0 ? "bg-green-500" : ""}
                      >
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </Badge>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
