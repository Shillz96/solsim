"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio } from "@/hooks/use-portfolio"
import { formatUSD, safePercent } from "@/lib/format"
import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Target, Percent, Trophy } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Overview Tab - Simplified Dashboard
 * Shows only the most important information at a glance:
 * - Level + XP progress
 * - Top 4 key metrics (Portfolio Value, Total P&L, Unrealized P&L, Win Rate)
 * - Condensed P&L summary
 * - Top 3 positions snapshot
 */
export function OverviewTab() {
  const { user } = useAuth()
  const { data: portfolio, isLoading } = usePortfolio()

  // Calculate key metrics
  const portfolioValue = parseFloat(portfolio?.totals?.totalValueUsd || '0')
  const totalPnL = parseFloat(portfolio?.totals?.totalPnlUsd || '0')
  const unrealizedPnL = parseFloat(portfolio?.totals?.totalUnrealizedUsd || '0')
  const winRate = typeof portfolio?.totals?.winRate === 'string' ? parseFloat(portfolio.totals.winRate) : (portfolio?.totals?.winRate || 0)
  const totalTrades = portfolio?.totals?.totalTrades || 0
  const winningTrades = portfolio?.totals?.winningTrades || 0

  // Get top 3 positions
  const topPositions = (portfolio?.positions || []).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Level + XP Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <div className="w-12 h-12 rounded-full border-3 border-[var(--outline-black)] overflow-hidden bg-white">
                <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              </div>
            ) : (
              <Image src="/icons/mario/user.png" alt="Profile" width={48} height={48} className="rounded-full" />
            )}
            <div>
              <div className="text-sm font-mario font-bold text-muted-foreground">LEVEL 1 TRADER</div>
              <div className="text-lg font-mario font-bold text-[var(--outline-black)]">{user?.email?.split('@')[0] || 'Anonymous'}</div>
            </div>
          </div>
          <div className="bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] rounded-lg px-4 py-2 shadow-[3px_3px_0_var(--outline-black)]">
            <div className="text-center">
              <div className="text-xs font-mario font-bold text-[var(--outline-black)]">XP</div>
              <div className="text-xl font-bold text-[var(--outline-black)]">350/1000</div>
            </div>
          </div>
        </div>
        
        {/* XP Progress Bar */}
        <div className="bg-gray-200 border-3 border-[var(--outline-black)] rounded-full h-4 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-[var(--luigi-green)] to-[var(--luigi-green)]/80 h-full"
            initial={{ width: 0 }}
            animate={{ width: "35%" }}
            transition={{ duration: 1 }}
          />
        </div>
      </motion.div>

      {/* Top 4 Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[4px_4px_0_var(--outline-black)] p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[var(--sky-blue)] border-2 border-[var(--outline-black)] rounded-lg p-2">
              <Image src="/icons/mario/money-bag.png" alt="Portfolio" width={20} height={20} />
            </div>
            <div className="text-xs font-bold text-muted-foreground">PORTFOLIO</div>
          </div>
          <div className="text-2xl font-mario font-bold text-[var(--outline-black)]">
            {isLoading ? '...' : formatUSD(portfolioValue)}
          </div>
        </motion.div>

        {/* Total P&L */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "border-4 border-[var(--outline-black)] rounded-xl shadow-[4px_4px_0_var(--outline-black)] p-4",
            totalPnL >= 0 ? "bg-[var(--luigi-green)]/10" : "bg-[var(--mario-red)]/10"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              "border-2 border-[var(--outline-black)] rounded-lg p-2",
              totalPnL >= 0 ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
            )}>
              {totalPnL >= 0 ? (
                <TrendingUp className="h-5 w-5 text-white" />
              ) : (
                <TrendingDown className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="text-xs font-bold text-muted-foreground">TOTAL P&L</div>
          </div>
          <div className={cn(
            "text-2xl font-mario font-bold",
            totalPnL >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
          )}>
            {isLoading ? '...' : formatUSD(totalPnL)}
          </div>
        </motion.div>

        {/* Unrealized P&L */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn(
            "border-4 border-[var(--outline-black)] rounded-xl shadow-[4px_4px_0_var(--outline-black)] p-4",
            unrealizedPnL >= 0 ? "bg-[var(--luigi-green)]/10" : "bg-[var(--mario-red)]/10"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              "border-2 border-[var(--outline-black)] rounded-lg p-2",
              unrealizedPnL >= 0 ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
            )}>
              <Image src="/icons/mario/star.png" alt="Unrealized" width={20} height={20} />
            </div>
            <div className="text-xs font-bold text-muted-foreground">OPEN P&L</div>
          </div>
          <div className={cn(
            "text-2xl font-mario font-bold",
            unrealizedPnL >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
          )}>
            {isLoading ? '...' : formatUSD(unrealizedPnL)}
          </div>
        </motion.div>

        {/* Win Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[var(--star-yellow)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[4px_4px_0_var(--outline-black)] p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[var(--star-yellow)] border-2 border-[var(--outline-black)] rounded-lg p-2">
              <Image src="/icons/mario/trophy.png" alt="Win Rate" width={20} height={20} />
            </div>
            <div className="text-xs font-bold text-muted-foreground">WIN RATE</div>
          </div>
          <div className="text-2xl font-mario font-bold text-[var(--outline-black)]">
            {isLoading ? '...' : `${Math.round(Number(winRate))}%`}
          </div>
        </motion.div>
      </div>

      {/* Condensed P&L Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Image src="/icons/mario/fire.png" alt="Stats" width={24} height={24} />
          <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">QUICK STATS</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground font-bold mb-1">Total Trades</div>
            <div className="text-xl font-mario font-bold text-[var(--outline-black)]">{totalTrades}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground font-bold mb-1">Wins</div>
            <div className="text-xl font-mario font-bold text-[var(--luigi-green)]">{winningTrades}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground font-bold mb-1">Losses</div>
            <div className="text-xl font-mario font-bold text-[var(--mario-red)]">{totalTrades - winningTrades}</div>
          </div>
        </div>
      </motion.div>

      {/* Top 3 Positions Snapshot */}
      {topPositions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image src="/icons/mario/mushroom.png" alt="Positions" width={24} height={24} />
              <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">TOP POSITIONS</h3>
            </div>
            <Link href="/portfolio?tab=coins">
              <button className="text-xs font-bold text-[var(--mario-red)] hover:underline">
                VIEW ALL →
              </button>
            </Link>
          </div>

          <div className="space-y-3">
            {topPositions.map((position: any, index: number) => {
              const pnl = position.unrealizedPnL || 0
              const pnlPercent = position.unrealizedPnLPercent || 0
              
              return (
                <Link href={`/room/${position.mint}`} key={position.mint}>
                  <div className="bg-white/50 border-3 border-[var(--outline-black)] rounded-lg p-3 hover:bg-white/80 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {position.tokenImage ? (
                          <img src={position.tokenImage} alt={position.tokenSymbol} className="w-10 h-10 rounded-full border-2 border-[var(--outline-black)]" />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full border-2 border-[var(--outline-black)]" />
                        )}
                        <div>
                          <div className="font-bold text-[var(--outline-black)]">{position.tokenSymbol}</div>
                          <div className="text-xs text-muted-foreground">{formatUSD(position.currentValue)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-bold",
                          pnl >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
                        )}>
                          {formatUSD(pnl)}
                        </div>
                        <div className={cn(
                          "text-xs font-bold",
                          pnl >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
                        )}>
                          {pnl >= 0 ? '+' : ''}{safePercent(pnlPercent, 2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
