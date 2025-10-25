/**
 * Trade Panel Price Display Component
 * Real-time price with SOL equivalent
 */

import { cn, marioStyles } from '@/lib/utils'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { formatSolEquivalent } from './utils/formatters'

interface TradePanelPriceProps {
  currentPrice: number
  solPrice: number
}

export function TradePanelPrice({ currentPrice, solPrice }: TradePanelPriceProps) {
  return (
    <div className={cn(
      marioStyles.cardGradient('from-[var(--star-yellow)] to-[var(--coin-gold)]'),
      'p-2 relative overflow-hidden'
    )}>
      <div className="absolute top-1 right-1 text-xl opacity-20">⭐</div>
      <div className={cn(
        marioStyles.bodyText('bold'), 
        'text-[9px] text-[var(--outline-black)]/80 uppercase'
      )}>
        Current Price
      </div>
      <AnimatedNumber
        value={currentPrice}
        prefix="$"
        decimals={8}
        className={cn(
          marioStyles.bodyText('bold'), 
          'font-mono text-sm break-all relative z-10'
        )}
        colorize={false}
        glowOnChange={true}
      />
      {solPrice > 0 && (
        <div className="text-[9px] font-bold text-[var(--outline-black)]/60 mt-0.5">
          {formatSolEquivalent(currentPrice, solPrice)}
        </div>
      )}
    </div>
  )
}
