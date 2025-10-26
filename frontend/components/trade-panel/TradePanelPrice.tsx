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
    <div className="p-2 border border-[var(--outline-black)]/20 rounded-lg bg-white">
      <div className="text-[10px] font-bold text-[var(--outline-black)]/60 uppercase tracking-tight">
        Current Price
      </div>
      <AnimatedNumber
        value={currentPrice}
        prefix="$"
        decimals={8}
        className="font-mono font-bold text-sm text-[var(--outline-black)] break-all"
        colorize={false}
        glowOnChange={true}
      />
      {solPrice > 0 && (
        <div className="text-[9px] text-[var(--outline-black)]/40 mt-0.5">
          {formatSolEquivalent(currentPrice, solPrice)}
        </div>
      )}
    </div>
  )
}
