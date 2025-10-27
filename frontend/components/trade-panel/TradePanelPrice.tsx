/**
 * Trade Panel Price Display Component
 * Simplified inline price display with SOL equivalent
 */

import { cn } from '@/lib/utils'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { formatSolEquivalent } from './utils/formatters'

interface TradePanelPriceProps {
  currentPrice: number
  solPrice: number
}

export function TradePanelPrice({ currentPrice, solPrice }: TradePanelPriceProps) {
  return (
    <div className="p-2 border-2 border-outline/30 rounded-[14px] bg-white shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
      <div className="text-[11px] font-bold text-outline/60 uppercase tracking-tight">
        Current Price
      </div>
      <AnimatedNumber
        value={currentPrice}
        prefix="$"
        decimals={8}
        className="font-mono font-bold text-sm text-outline break-all"
        colorize={false}
        glowOnChange={true}
      />
      {solPrice > 0 && (
        <div className="text-[10px] text-outline/40 mt-0.5">
          {formatSolEquivalent(currentPrice, solPrice)}
        </div>
      )}
    </div>
  )
}
