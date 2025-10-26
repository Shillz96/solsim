/**
 * Trade Panel Fees Component
 * Displays estimated trading fees
 */

import { Info } from 'lucide-react'
import { formatSolAmount, formatUsdAmount } from './utils/formatters'
import type { TradeFees } from './types'

interface TradePanelFeesProps {
  fees: TradeFees
}

export function TradePanelFees({ fees }: TradePanelFeesProps) {
  const hasFees = fees && fees.estimatedFeeSol > 0
  
  return (
    <div className="bg-[var(--outline-black)]/5 border border-[var(--outline-black)]/20 rounded p-1.5 text-[9px]">
      <div className="flex items-center gap-1 text-[var(--outline-black)]/60">
        <Info className="h-2.5 w-2.5" />
        <span className="font-bold">Estimated Fees ({hasFees ? fees.totalFeePercent : 0}%)</span>
      </div>
      <div className="font-mono text-[8px] text-[var(--outline-black)]/80 mt-0.5">
        {hasFees ? (
          <>~{formatSolAmount(fees.estimatedFeeSol)} SOL ({formatUsdAmount(fees.estimatedFeeUsd)})</>
        ) : (
          <>~0.000 SOL ($0.00)</>
        )}
      </div>
    </div>
  )
}
