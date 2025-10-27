/**
 * Trade Panel Position Component
 * Displays holdings and real-time PnL
 */

import { TrendingUp, TrendingDown, Coins } from 'lucide-react'
import { cn, marioStyles } from '@/lib/utils'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { formatTokenAmount, formatUsdAmount, formatPercentage } from './utils/formatters'
import { motion } from 'framer-motion'
import type { RealtimePnL } from './types'

interface TradePanelPositionProps {
  tokenSymbol: string | null
  position: { qty: string } | null
  pnl: RealtimePnL | null
}

export function TradePanelPosition({
  tokenSymbol,
  position,
  pnl
}: TradePanelPositionProps) {
  // Always render, but show empty state when no position
  const hasPosition = position && parseFloat(position.qty) > 0
  const isProfit = pnl ? pnl.unrealizedPnL >= 0 : true
  const hasSignificantPnL = pnl ? Math.abs(pnl.unrealizedPnL) > 0.01 : false

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      {/* Holdings Display - Always visible */}
      <div className="bg-star/20 border-2 border-star rounded-[14px] p-1.5 shadow-[2px_2px_0_var(--outline-black)]">
        <div className="flex items-center gap-1 text-[9px] text-outline/70 font-bold">
          <Coins className="h-3 w-3" />
          <span>Holdings</span>
        </div>
        <div className="font-mono font-bold text-xs text-outline break-words">
          {hasPosition
            ? `${formatTokenAmount(parseFloat(position.qty))} ${tokenSymbol}`
            : `0 ${tokenSymbol || 'tokens'}`}
        </div>
      </div>

      {/* Real-Time PnL Display - Always visible */}
      <div className={cn(
        'border-2 rounded-[14px] p-2 shadow-[3px_3px_0_var(--outline-black)] relative overflow-hidden',
        hasSignificantPnL
          ? isProfit
            ? 'bg-luigi/20 border-luigi'
            : 'bg-mario/20 border-mario'
          : 'bg-[var(--outline-black)]/5 border-outline/20'
      )}>
        {/* Animated Background Icon - Only when has PnL */}
        {hasSignificantPnL && (
          <motion.div
            animate={{
              rotate: isProfit ? [0, 10, -10, 0] : [0, -10, 10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute top-1 right-1 text-2xl opacity-10"
          >
            {isProfit ? '⭐' : '💔'}
          </motion.div>
        )}

        {/* PnL Header */}
        <div className="flex items-center gap-1 mb-1">
          {hasSignificantPnL ? (
            isProfit ? (
              <TrendingUp className="h-3 w-3 text-luigi" />
            ) : (
              <TrendingDown className="h-3 w-3 text-mario" />
            )
          ) : (
            <TrendingUp className="h-3 w-3 text-outline/40" />
          )}
          <span className={cn(
            marioStyles.bodyText('bold'),
            'text-[9px] uppercase',
            hasSignificantPnL
              ? isProfit ? 'text-luigi' : 'text-mario'
              : 'text-outline/40'
          )}>
            Real-Time P&L
          </span>
        </div>

        {/* PnL Values */}
        <div className="space-y-0.5 relative z-10">
          <div className="flex items-baseline justify-between">
            <span className="text-[8px] font-bold text-outline/70">
              Unrealized:
            </span>
            {hasPosition && pnl ? (
              <AnimatedNumber
                value={pnl.unrealizedPnL}
                prefix="$"
                decimals={2}
                colorize={true}
                className="font-mono font-bold text-sm"
              />
            ) : (
              <span className="font-mono font-bold text-sm text-outline/40">
                $0.00
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[8px] font-bold text-outline/70">
              Percentage:
            </span>
            {hasPosition && pnl ? (
              <span className={cn(
                'font-mono font-bold text-sm',
                isProfit ? 'text-luigi' : 'text-mario'
              )}>
                {formatPercentage(pnl.unrealizedPercent)}
              </span>
            ) : (
              <span className="font-mono font-bold text-sm text-outline/40">
                0.00%
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
