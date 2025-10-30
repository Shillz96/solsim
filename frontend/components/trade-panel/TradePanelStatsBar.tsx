/**
 * Trade Panel Stats Bar Component
 * Displays 2x2 grid: Bought | Sold | Holding | PnL
 * Redesigned with token-first CSS and soft elevation
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
    <div className="trade-tier">
      <div className="trade-summary">
        {/* Bought */}
        <div className="trade-metric">
          <div className="label">Bought</div>
          <div className="value" title={`$${bought.toFixed(2)}`}>
            {formatUsdAmount(bought)}
          </div>
        </div>

        {/* Sold */}
        <div className="trade-metric">
          <div className="label">Sold</div>
          <div className="value" title={`$${sold.toFixed(2)}`}>
            {formatUsdAmount(sold)}
          </div>
        </div>

        {/* Holding */}
        <div className="trade-metric">
          <div className="label">Holding</div>
          <div className="value" title={`$${holdingValue.toFixed(2)}`}>
            {formatUsdAmount(holdingValue)}
          </div>
        </div>

        {/* PnL */}
        <div className="trade-metric">
          <div className="label">PnL</div>
          <div className={cn(
            'value',
            isProfit ? 'text-luigi' : 'text-mario'
          )} title={`${isProfit ? '+' : ''}$${pnl.toFixed(2)}`}>
            {isProfit ? '+' : ''}{formatUsdAmount(pnl)}
          </div>
          <div className={cn(
            'text-[9px] font-bold',
            isProfit ? 'text-luigi' : 'text-mario'
          )}>
            ({isProfit ? '+' : ''}{formatPercentage(pnlPercent)})
          </div>
        </div>
      </div>
    </div>
  )
}
