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
    <div className="grid grid-cols-2 gap-2">
      {/* Bought */}
      <div className="bg-gradient-to-br from-white/80 to-white/60 rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-5 h-5 rounded-full bg-[var(--luigi-green)] flex items-center justify-center border-[2px] border-[var(--outline-black)]">
            <TrendingUp className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-[9px] font-semibold text-[var(--outline-black)]/60 uppercase">Bought</span>
        </div>
        <div className="font-mono font-bold text-[var(--outline-black)] text-sm" title={`$${bought.toFixed(2)}`}>
          {formatUsdAmount(bought)}
        </div>
      </div>

      {/* Sold */}
      <div className="bg-gradient-to-br from-white/80 to-white/60 rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-5 h-5 rounded-full bg-[var(--mario-red)] flex items-center justify-center border-[2px] border-[var(--outline-black)]">
            <TrendingDown className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-[9px] font-semibold text-[var(--outline-black)]/60 uppercase">Sold</span>
        </div>
        <div className="font-mono font-bold text-[var(--outline-black)] text-sm" title={`$${sold.toFixed(2)}`}>
          {formatUsdAmount(sold)}
        </div>
      </div>

      {/* Holding */}
      <div className="bg-gradient-to-br from-white/80 to-white/60 rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-5 h-5 rounded-full bg-[var(--sky-blue)] flex items-center justify-center border-[2px] border-[var(--outline-black)]">
            <Wallet className="h-2.5 w-2.5 text-[var(--outline-black)]" />
          </div>
          <span className="text-[9px] font-semibold text-[var(--outline-black)]/60 uppercase">Holding</span>
        </div>
        <div className="font-mono font-bold text-[var(--outline-black)] text-sm" title={`$${holdingValue.toFixed(2)}`}>
          {formatUsdAmount(holdingValue)}
        </div>
      </div>

      {/* PnL */}
      <div className={cn(
        "rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-2",
        isProfit ? "bg-gradient-to-br from-[var(--luigi-green)]/20 to-[var(--luigi-green)]/10" : "bg-gradient-to-br from-[var(--mario-red)]/20 to-[var(--mario-red)]/10"
      )}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center border-[2px] border-[var(--outline-black)]",
            isProfit ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
          )}>
            <DollarSign className="h-2.5 w-2.5 text-white" />
          </div>
          <span className="text-[9px] font-semibold text-[var(--outline-black)]/60 uppercase">P&L</span>
        </div>
        <div className={cn(
          'font-mono font-bold text-sm',
          isProfit ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
        )} title={`${isProfit ? '+' : ''}$${pnl.toFixed(2)}`}>
          {isProfit ? '+' : ''}{formatUsdAmount(pnl)}
        </div>
        <div className={cn(
          'text-[9px] font-bold',
          isProfit ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
        )}>
          ({isProfit ? '+' : ''}{formatPercentage(pnlPercent)})
        </div>
      </div>
    </div>
  )
}
