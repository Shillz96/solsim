/**
 * Trade Panel Stats Bar Component
 * Displays 2x2 grid: Bought | Sold | Holding | PnL
 * Matches Mario-themed card aesthetic
 */

import { cn } from '@/lib/utils'
import { formatUsdAmount, formatPercentage } from './utils/formatters'
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react'

interface TradePanelStatsBarProps {
  bought: number        // Lifetime bought USD
  sold: number          // Lifetime sold USD
  holdingValue: number  // Current position value USD
  pnl: number          // Unrealized PnL USD
  pnlPercent: number   // Unrealized PnL %
}

export function TradePanelStatsBar({
  bought,
  sold,
  holdingValue,
  pnl,
  pnlPercent
}: TradePanelStatsBarProps) {
  const isProfit = pnl >= 0

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Bought */}
      <div className="bg-[var(--card)] rounded-lg border-[3px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-[var(--luigi-green)] flex items-center justify-center border-[2px] border-[var(--outline-black)]">
            <TrendingUp className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-[var(--outline-black)]/60 uppercase">Bought</span>
        </div>
        <div className="font-mono font-bold text-[var(--outline-black)] text-lg" title={`$${bought.toFixed(2)}`}>
          {formatUsdAmount(bought)}
        </div>
      </div>

      {/* Sold */}
      <div className="bg-[var(--card)] rounded-lg border-[3px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-[var(--mario-red)] flex items-center justify-center border-[2px] border-[var(--outline-black)]">
            <TrendingDown className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-[var(--outline-black)]/60 uppercase">Sold</span>
        </div>
        <div className="font-mono font-bold text-[var(--outline-black)] text-lg" title={`$${sold.toFixed(2)}`}>
          {formatUsdAmount(sold)}
        </div>
      </div>

      {/* Holding */}
      <div className="bg-[var(--card)] rounded-lg border-[3px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-[var(--sky-blue)] flex items-center justify-center border-[2px] border-[var(--outline-black)]">
            <Wallet className="h-3 w-3 text-[var(--outline-black)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--outline-black)]/60 uppercase">Holding</span>
        </div>
        <div className="font-mono font-bold text-[var(--outline-black)] text-lg" title={`$${holdingValue.toFixed(2)}`}>
          {formatUsdAmount(holdingValue)}
        </div>
      </div>

      {/* PnL */}
      <div className={cn(
        "rounded-lg border-[3px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-3",
        isProfit ? "bg-[var(--luigi-green)]/10" : "bg-[var(--mario-red)]/10"
      )}>
        <div className="flex items-center gap-2 mb-1">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center border-[2px] border-[var(--outline-black)]",
            isProfit ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
          )}>
            <DollarSign className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-[var(--outline-black)]/60 uppercase">P&L</span>
        </div>
        <div className={cn(
          'font-mono font-bold text-lg',
          isProfit ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
        )} title={`${isProfit ? '+' : ''}$${pnl.toFixed(2)}`}>
          {isProfit ? '+' : ''}{formatUsdAmount(pnl)}
        </div>
        <div className={cn(
          'text-xs font-bold',
          isProfit ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
        )}>
          ({isProfit ? '+' : ''}{formatPercentage(pnlPercent)})
        </div>
      </div>
    </div>
  )
}
