/**
 * Trade Panel Stats Bar Component
 * Displays 1x4 grid: Bought | Sold | Holding | PnL
 * Mario-themed with white backgrounds and colored borders
 */

import { cn } from '@/lib/utils'
import { formatUsdAmount, formatPercentage } from './utils/formatters'

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
    <div className="grid grid-cols-4 gap-1.5">
      {/* Bought */}
      <div className="bg-white border-2 border-[var(--luigi-green)] rounded-lg p-1.5 text-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className="text-[9px] font-bold text-[var(--outline-black)]/60 uppercase tracking-tight">
          Bought
        </div>
        <div className="font-mono font-bold text-xs text-[var(--luigi-green)] mt-0.5">
          {formatUsdAmount(bought)}
        </div>
      </div>

      {/* Sold */}
      <div className="bg-white border-2 border-[var(--mario-red)] rounded-lg p-1.5 text-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className="text-[9px] font-bold text-[var(--outline-black)]/60 uppercase tracking-tight">
          Sold
        </div>
        <div className="font-mono font-bold text-xs text-[var(--mario-red)] mt-0.5">
          {formatUsdAmount(sold)}
        </div>
      </div>

      {/* Holding */}
      <div className="bg-white border-2 border-[var(--outline-black)]/30 rounded-lg p-1.5 text-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className="text-[9px] font-bold text-[var(--outline-black)]/60 uppercase tracking-tight">
          Holding
        </div>
        <div className="font-mono font-bold text-xs text-[var(--outline-black)] mt-0.5">
          {formatUsdAmount(holdingValue)}
        </div>
      </div>

      {/* PnL */}
      <div className={cn(
        "border-2 rounded-lg p-1.5 text-center shadow-[2px_2px_0_var(--outline-black)]",
        isProfit
          ? "bg-[var(--luigi-green)]/10 border-[var(--luigi-green)]"
          : "bg-[var(--mario-red)]/10 border-[var(--mario-red)]"
      )}>
        <div className="text-[9px] font-bold text-[var(--outline-black)]/60 uppercase tracking-tight">
          PnL
        </div>
        <div className={cn(
          'font-mono font-bold text-xs mt-0.5',
          isProfit ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
        )}>
          {isProfit ? '+' : ''}{formatUsdAmount(pnl)}
        </div>
        <div className={cn(
          'text-[8px] font-bold',
          isProfit ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
        )}>
          ({isProfit ? '+' : ''}{formatPercentage(pnlPercent)})
        </div>
      </div>
    </div>
  )
}
