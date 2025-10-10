"use client"

import { Card } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { TrendingUp, TrendingDown, Activity, Wallet } from "lucide-react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import * as api from "@/lib/api"
import Link from "next/link"

interface MiniPortfolioBarProps {
  showFullStats?: boolean;
  className?: string;
}

export function MiniPortfolioBar({ showFullStats = false, className = "" }: MiniPortfolioBarProps) {
  const { user, isAuthenticated } = useAuth()

  const { 
    data: portfolio, 
    isLoading 
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

  if (!isAuthenticated || !user) {
    return null
  }

  if (isLoading) {
    return (
      <Card className={`p-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Loading...</span>
        </div>
      </Card>
    )
  }

  if (!portfolio) {
    return (
      <Card className={`p-3 ${className}`}>
        <Link href="/portfolio" className="flex items-center space-x-2 hover:opacity-80">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Start Trading</span>
        </Link>
      </Card>
    )
  }

  const totalValue = parseFloat(portfolio.totals.totalValueUsd)
  const totalPnL = parseFloat(portfolio.totals.totalPnlUsd)
  const unrealizedPnL = parseFloat(portfolio.totals.totalUnrealizedUsd)
  const realizedPnL = parseFloat(portfolio.totals.totalRealizedUsd)
  const winRate = parseFloat(portfolio.totals.winRate)
  const totalTrades = portfolio.totals.totalTrades
  
  const costBasis = totalValue - unrealizedPnL
  const totalPnLPercent = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0
  const isPositive = totalPnL >= 0

  return (
    <Link href="/portfolio">
      <Card className={`p-3 hover:shadow-md transition-shadow cursor-pointer ${className}`}>
        <div className="flex items-center justify-between">
          {/* Portfolio Value & PnL */}
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Portfolio</span>
                <span className="text-sm font-bold">
                  <AnimatedNumber value={totalValue} prefix="$" decimals={0} />
                </span>
              </div>
              <div className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}
                <AnimatedNumber value={Math.abs(totalPnL)} prefix="$" decimals={2} />
                <span className="ml-1">
                  ({isPositive ? '+' : ''}{totalPnLPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Extended Stats (if enabled) */}
          {showFullStats && (
            <motion.div 
              className="flex items-center space-x-4 text-sm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Win Rate</div>
                <div className={`font-medium ${winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                  <AnimatedNumber value={winRate} suffix="%" decimals={0} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Trades</div>
                <div className="font-medium">
                  <AnimatedNumber value={totalTrades} decimals={0} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Realized</div>
                <div className={`font-medium ${realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <AnimatedNumber value={Math.abs(realizedPnL)} prefix="$" decimals={0} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </Card>
    </Link>
  )
}