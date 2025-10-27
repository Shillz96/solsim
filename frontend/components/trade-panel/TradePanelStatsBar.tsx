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
      <div className="bg-white border-2 border-outline rounded-lg p-3 flex flex-col items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className="text-[10px] font-bold text-outline/60 uppercase tracking-tight mb-1">
          Bought
        </div>
        <div className="font-mono font-bold text-lg text-outline">
          {formatUsdAmount(bought)}
        </div>
      </div>

      {/* Sold */}
      <div className="bg-white border-2 border-outline rounded-lg p-3 flex flex-col items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className="text-[10px] font-bold text-outline/60 uppercase tracking-tight mb-1">
          Sold
        </div>
        <div className="font-mono font-bold text-lg text-outline">
          {formatUsdAmount(sold)}
        </div>
      </div>

      {/* Holding */}
      <div className="bg-white border-2 border-outline rounded-lg p-3 flex flex-col items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
        <div className="text-[10px] font-bold text-outline/60 uppercase tracking-tight mb-1">
          Holding
        </div>
        <div className="font-mono font-bold text-lg text-outline">
          {formatUsdAmount(holdingValue)}
        </div>
      </div>

      {/* PnL */}
      <div className={cn(
        "border-2 border-outline rounded-lg p-3 flex flex-col items-center justify-center shadow-[2px_2px_0_var(--outline-black)]",
        isProfit ? "bg-luigi/10" : "bg-mario/10"
      )}>
        <div className="text-[10px] font-bold text-outline/60 uppercase tracking-tight mb-1">
          PnL
        </div>
        <div className={cn(
          'font-mono font-bold text-lg',
          isProfit ? 'text-luigi' : 'text-mario'
        )}>
          {isProfit ? '+' : ''}{formatUsdAmount(pnl)}
        </div>
        <div className={cn(
          'text-[10px] font-bold mt-0.5',
          isProfit ? 'text-luigi' : 'text-mario'
        )}>
          ({isProfit ? '+' : ''}{formatPercentage(pnlPercent)})
        </div>
      </div>
    </div>
  )
}
