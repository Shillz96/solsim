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
    <div className="bg-white/60 rounded-lg border-[2px] border-[var(--outline-black)] p-3 flex items-center justify-between">
      <span className="text-xs font-semibold text-[var(--outline-black)]/60 uppercase">
        You'll Receive
      </span>
      <div className="flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-[var(--outline-black)]/40" />
        <span className={cn(
          'font-mono font-bold text-sm',
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
    </div>
  )
}
