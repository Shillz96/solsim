"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { TrendingUp, TrendingDown, Wallet, Activity, AlertCircle, RefreshCw, Share } from "lucide-react"
import { motion } from "framer-motion"
import { SharePnLDialog } from "@/components/modals/share-pnl-dialog"
import { memo, useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import * as Backend from "@/lib/types/backend"
import * as api from "@/lib/api"

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  // Use React Query to fetch portfolio data directly
  const { 
    data: portfolio, 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');
      return api.getPortfolio(userId);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  const handleShare = useCallback(() => {
    setShareDialogOpen(true)
  }, [])

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Activity className="h-5 w-5 animate-pulse" />
            <span>Loading PnL data...</span>
          </div>
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
              Failed to load PnL data: {error instanceof Error ? error.message : 'Unknown error'}
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
        </div>
      </Card>
    )
  }

  if (!portfolio) {
    return (
      <Card className="relative overflow-hidden">
        <div className="p-6 text-center">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Portfolio Data</h3>
          <p className="text-muted-foreground">
            Start trading to see your PnL here
          </p>
        </div>
      </Card>
    )
  }

  const totalValue = parseFloat(portfolio.totals.totalValueUsd)
  const totalPnL = parseFloat(portfolio.totals.totalPnlUsd)
  const unrealizedPnL = parseFloat(portfolio.totals.totalUnrealizedUsd)
  const realizedPnL = parseFloat(portfolio.totals.totalRealizedUsd)
  
  // Calculate PnL percentage based on total invested (cost basis)
  const costBasis = totalValue - unrealizedPnL
  const totalPnLPercent = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0
  
  const isPositive = totalPnL >= 0

  return (
    <>
      <Card className="relative overflow-hidden">
        <AnimatedBackground isPositive={isPositive} />
        
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {isPositive ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <h2 className="text-lg font-semibold">Portfolio P&L</h2>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="p-2"
              >
                <Share className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefetching}
                className="p-2"
              >
                {isRefetching ? (
                  <Activity className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Main PnL Display */}
          <div className="text-center mb-6">
            <motion.div
              key={totalPnL}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm text-muted-foreground mb-1">Total P&L</p>
              <div className="flex items-center justify-center space-x-1 mb-2">
                <span className={`text-3xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {isPositive ? '+' : ''}
                  <AnimatedNumber 
                    value={Math.abs(totalPnL)} 
                    prefix="$" 
                    decimals={2}
                  />
                </span>
              </div>
              <div className={`text-lg font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{totalPnLPercent.toFixed(2)}%
              </div>
            </motion.div>
          </div>

          {/* Portfolio Value */}
          <div className="text-center mb-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Portfolio Value</p>
            <p className="text-2xl font-bold">
              <AnimatedNumber value={totalValue} prefix="$" decimals={2} />
            </p>
          </div>

          {/* PnL Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm text-muted-foreground mb-1">Realized</p>
              <p className={`text-lg font-semibold ${realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {realizedPnL >= 0 ? '+' : ''}
                <AnimatedNumber value={Math.abs(realizedPnL)} prefix="$" decimals={2} />
              </p>
            </motion.div>
            
            <motion.div 
              className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm text-muted-foreground mb-1">Unrealized</p>
              <p className={`text-lg font-semibold ${unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {unrealizedPnL >= 0 ? '+' : ''}
                <AnimatedNumber value={Math.abs(unrealizedPnL)} prefix="$" decimals={2} />
              </p>
            </motion.div>
          </div>

          {/* Performance Indicator */}
          <div className="mt-4 flex items-center justify-center">
            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
              isPositive 
                ? 'bg-green-500/20 text-green-700 dark:text-green-300' 
                : 'bg-red-500/20 text-red-700 dark:text-red-300'
            }`}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{isPositive ? 'Profitable' : 'At Loss'}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Share Dialog */}
      <SharePnLDialog
        totalPnL={totalPnL}
        totalPnLPercent={totalPnLPercent}
        currentValue={totalValue}
        initialBalance={initialBalance}
      />
    </>
  )
}
