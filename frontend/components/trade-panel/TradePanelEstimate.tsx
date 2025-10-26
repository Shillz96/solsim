/**
 * Trade Panel Estimate Component
 * Simplified inline estimate display
 */

import { cn } from '@/lib/utils'
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
    <div className="text-[11px] text-[var(--outline-black)]/70 font-medium">
      <span className="font-bold">You'll Receive:</span>{' '}
      <span className={cn(
        'font-mono font-bold',
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
