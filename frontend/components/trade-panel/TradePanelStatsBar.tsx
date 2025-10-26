/**
 * Trade Panel Stats Bar Component
 * Displays 1x4 grid: Bought | Sold | Holding | PnL
 * Dark background with colored values
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
    <div className="bg-[var(--outline-black)] rounded-lg overflow-hidden border-2 border-[var(--outline-black)]">
      <div className="grid grid-cols-4 gap-[1px] bg-[var(--outline-black)]">
        {/* Bought */}
        <div className="bg-black/90 p-2 text-center">
          <div className="text-[10px] font-bold text-white/60 uppercase tracking-tight">
            Bought
          </div>
          <div className="font-mono font-bold text-sm text-[var(--luigi-green)] mt-0.5">
            {formatUsdAmount(bought)}
          </div>
        </div>

        {/* Sold */}
        <div className="bg-black/90 p-2 text-center">
          <div className="text-[10px] font-bold text-white/60 uppercase tracking-tight">
            Sold
          </div>
          <div className="font-mono font-bold text-sm text-[var(--mario-red)] mt-0.5">
            {formatUsdAmount(sold)}
          </div>
        </div>

        {/* Holding */}
        <div className="bg-black/90 p-2 text-center">
          <div className="text-[10px] font-bold text-white/60 uppercase tracking-tight">
            Holding
          </div>
          <div className="font-mono font-bold text-sm text-white mt-0.5">
            {formatUsdAmount(holdingValue)}
          </div>
        </div>

        {/* PnL */}
        <div className="bg-black/90 p-2 text-center">
          <div className="text-[10px] font-bold text-white/60 uppercase tracking-tight">
            PnL
          </div>
          <div className={cn(
            'font-mono font-bold text-sm mt-0.5',
            isProfit ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
          )}>
            {isProfit ? '+' : ''}{formatUsdAmount(pnl)}
          </div>
          <div className={cn(
            'text-[9px] font-bold',
            isProfit ? 'text-[var(--luigi-green)]/80' : 'text-[var(--mario-red)]/80'
          )}>
            ({isProfit ? '+' : ''}{formatPercentage(pnlPercent)})
          </div>
        </div>
      </div>
    </div>
  )
}
