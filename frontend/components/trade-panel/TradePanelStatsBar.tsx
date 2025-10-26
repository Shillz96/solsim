/**
 * Trade Panel Stats Bar Component
 * Displays 1x4 grid: Bought | Sold | Holding | PnL
 * Matches TokenVitalsBar styling with circular icons
 */

import { TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react'
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
    <div className="grid grid-cols-4 gap-2">
      {/* Bought */}
      <div className="bg-white border-2 border-[var(--outline-black)] rounded-lg p-2 flex flex-col items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className="w-10 h-10 rounded-full bg-[var(--luigi-green)] border-2 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] mb-1">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div className="text-[10px] font-bold text-[var(--outline-black)]/60 uppercase tracking-tight">
          Bought
        </div>
        <div className="font-mono font-bold text-xs text-[var(--outline-black)] mt-0.5">
          {formatUsdAmount(bought)}
        </div>
      </div>

      {/* Sold */}
      <div className="bg-white border-2 border-[var(--outline-black)] rounded-lg p-2 flex flex-col items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className="w-10 h-10 rounded-full bg-[var(--mario-red)] border-2 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] mb-1">
          <TrendingDown className="w-5 h-5 text-white" />
        </div>
        <div className="text-[10px] font-bold text-[var(--outline-black)]/60 uppercase tracking-tight">
          Sold
        </div>
        <div className="font-mono font-bold text-xs text-[var(--outline-black)] mt-0.5">
          {formatUsdAmount(sold)}
        </div>
      </div>

      {/* Holding */}
      <div className="bg-white border-2 border-[var(--outline-black)] rounded-lg p-2 flex flex-col items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className="w-10 h-10 rounded-full bg-[var(--outline-black)] border-2 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] mb-1">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div className="text-[10px] font-bold text-[var(--outline-black)]/60 uppercase tracking-tight">
          Holding
        </div>
        <div className="font-mono font-bold text-xs text-[var(--outline-black)] mt-0.5">
          {formatUsdAmount(holdingValue)}
        </div>
      </div>

      {/* PnL */}
      <div className="bg-white border-2 border-[var(--outline-black)] rounded-lg p-2 flex flex-col items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className={cn(
          "w-10 h-10 rounded-full border-2 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] mb-1",
          isProfit ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
        )}>
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div className="text-[10px] font-bold text-[var(--outline-black)]/60 uppercase tracking-tight">
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
