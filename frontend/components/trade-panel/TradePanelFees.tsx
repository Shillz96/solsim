/**
 * Trade Panel Fees Component
 * Simplified inline fees display
 */

import { formatSolAmount, formatUsdAmount } from './utils/formatters'
import type { TradeFees } from './types'

interface TradePanelFeesProps {
  fees: TradeFees
}

export function TradePanelFees({ fees }: TradePanelFeesProps) {
  const hasFees = fees && fees.estimatedFeeSol > 0

  return (
    <div className="text-[10px] text-[var(--outline-black)]/60 font-medium">
      <span className="font-bold">Fees:</span>{' '}
      <span className="font-mono">
        {hasFees ? (
          <>~{formatSolAmount(fees.estimatedFeeSol)} SOL ({formatUsdAmount(fees.estimatedFeeUsd)})</>
        ) : (
          <>~0.000 SOL ($0.00)</>
        )}
      </span>
    </div>
  )
}
