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
    <div className="grid grid-cols-4 gap-1.5">
      {/* Bought */}
      <div className="bg-white border-3 border-outline rounded-[14px] p-2 flex flex-col items-center justify-center shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all min-w-0">
        <div className="text-[10px] font-bold text-outline/60 uppercase tracking-tight mb-0.5 whitespace-nowrap">
          Bought
        </div>
        <div className="font-mono font-bold text-[11px] text-outline truncate w-full text-center" title={`$${bought.toFixed(2)}`}>
          {formatUsdAmount(bought)}
        </div>
      </div>

      {/* Sold */}
      <div className="bg-white border-3 border-outline rounded-[14px] p-2 flex flex-col items-center justify-center shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all min-w-0">
        <div className="text-[10px] font-bold text-outline/60 uppercase tracking-tight mb-0.5 whitespace-nowrap">
          Sold
        </div>
        <div className="font-mono font-bold text-[11px] text-outline truncate w-full text-center" title={`$${sold.toFixed(2)}`}>
          {formatUsdAmount(sold)}
        </div>
      </div>

      {/* Holding */}
      <div className="bg-white border-3 border-outline rounded-[14px] p-2 flex flex-col items-center justify-center shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all min-w-0">
        <div className="text-[10px] font-bold text-outline/60 uppercase tracking-tight mb-0.5 whitespace-nowrap">
          Holding
        </div>
        <div className="font-mono font-bold text-[11px] text-outline truncate w-full text-center" title={`$${holdingValue.toFixed(2)}`}>
          {formatUsdAmount(holdingValue)}
        </div>
      </div>

      {/* PnL */}
      <div className={cn(
        "border-3 border-outline rounded-[14px] p-2 flex flex-col items-center justify-center shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all min-w-0",
        isProfit ? "bg-luigi/10" : "bg-mario/10"
      )}>
        <div className="text-[10px] font-bold text-outline/60 uppercase tracking-tight mb-0.5 whitespace-nowrap">
          PnL
        </div>
        <div className={cn(
          'font-mono font-bold text-[11px] truncate w-full text-center',
          isProfit ? 'text-luigi' : 'text-mario'
        )} title={`${isProfit ? '+' : ''}$${pnl.toFixed(2)}`}>
          {isProfit ? '+' : ''}{formatUsdAmount(pnl)}
        </div>
        <div className={cn(
          'text-[9px] font-bold mt-0.5 truncate w-full text-center',
          isProfit ? 'text-luigi' : 'text-mario'
        )}>
          ({isProfit ? '+' : ''}{formatPercentage(pnlPercent)})
        </div>
      </div>
    </div>
  )
}
