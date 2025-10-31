/**
 * Trade Panel Estimate Component
 * Simplified inline estimate display
 * Updated to match Mario-themed card aesthetic
 */

import { cn } from '@/lib/utils'
import { formatTokenAmount, formatSolAmount } from './utils/formatters'
import { ArrowRight } from 'lucide-react'

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
    <div className="bg-white/70 rounded-lg border-[2px] border-[var(--outline-black)] p-2 flex items-center justify-between">
      <span className="text-[9px] font-semibold text-[var(--outline-black)]/60 uppercase flex items-center gap-1">
        <ArrowRight className="h-3 w-3 text-[var(--outline-black)]/40" />
        You'll Get
      </span>
      <span className={cn(
        'font-mono font-bold text-xs',
        isBuy ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'
      )}>
        {isBuy && estimate.tokens !== undefined && (
          <>~{formatTokenAmount(estimate.tokens)} {tokenSymbol}</>
        )}
        {!isBuy && estimate.sol !== undefined && (
          <>~{formatSolAmount(estimate.sol)} SOL</>
        )}
      </span>
    </div>
  )
}
