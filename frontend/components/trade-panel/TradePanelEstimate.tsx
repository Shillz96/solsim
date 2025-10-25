/**
 * Trade Panel Estimate Component
 * Shows estimated tokens/SOL for trade
 */

import { cn, marioStyles } from '@/lib/utils'
import { formatTokenAmount, formatSolAmount } from './utils/formatters'

interface TradePanelEstimateProps {
  type: 'buy' | 'sell'
  tokenSymbol: string | null
  estimate: {
    tokens?: number
    sol?: number
  }
}

export function TradePanelEstimate({ type, tokenSymbol, estimate }: TradePanelEstimateProps) {
  const isBuy = type === 'buy'
  
  return (
    <div className={cn(
      'border-2 rounded-lg p-1.5 shadow-[2px_2px_0_var(--outline-black)]',
      isBuy 
        ? 'bg-gradient-to-br from-[var(--luigi-green)]/20 to-[var(--pipe-green)]/20 border-[var(--luigi-green)]'
        : 'bg-gradient-to-br from-[var(--mario-red)]/20 to-[var(--mario-red)]/10 border-[var(--mario-red)]'
    )}>
      <div className="text-[8px] font-mario font-bold text-[var(--outline-black)]/70 uppercase">
        You'll Receive
      </div>
      <div className={cn(
        'font-mono font-bold text-xs',
        isBuy ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
      )}>
        {isBuy && estimate.tokens !== undefined && (
          <>
            ~{formatTokenAmount(estimate.tokens)} {tokenSymbol}
          </>
        )}
        {!isBuy && estimate.sol !== undefined && (
          <>
            ~{formatSolAmount(estimate.sol)} SOL
            {estimate.tokens !== undefined && (
              <div className="text-[8px] font-bold text-[var(--outline-black)]/60">
                ({formatTokenAmount(estimate.tokens)} {tokenSymbol})
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
