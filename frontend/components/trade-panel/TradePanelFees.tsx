/**
 * Trade Panel Fees Component
 * Simplified inline fees display
 * Updated to match Mario-themed card aesthetic
 */

import { formatSolAmount, formatUsdAmount } from './utils/formatters'
import { Info } from 'lucide-react'
import type { TradeFees } from './types'

interface TradePanelFeesProps {
  fees: TradeFees
}

export function TradePanelFees({ fees }: TradePanelFeesProps) {
  const hasFees = fees && fees.estimatedFeeSol > 0

  return (
    <div className="bg-white/40 rounded-lg border-[2px] border-[var(--outline-black)] p-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Info className="h-3 w-3 text-[var(--outline-black)]/40" />
        <span className="text-xs font-semibold text-[var(--outline-black)]/60">
          Fees
        </span>
      </div>
      <span className="font-mono text-xs font-bold text-[var(--outline-black)]">
        {hasFees ? (
          <>~{formatSolAmount(fees.estimatedFeeSol)} SOL ({formatUsdAmount(fees.estimatedFeeUsd)})</>
        ) : (
          <>~0.000 SOL ($0.00)</>
        )}
      </span>
    </div>
  )
}
