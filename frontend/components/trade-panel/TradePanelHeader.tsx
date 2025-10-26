/**
 * Trade Panel Header Component
 * Displays token symbol and user balance
 */

import { Wallet } from 'lucide-react'
import { cn, marioStyles } from '@/lib/utils'
import { formatSolAmount } from './utils/formatters'

interface TradePanelHeaderProps {
  tokenSymbol: string | null
  balance: number
}

export function TradePanelHeader({ tokenSymbol, balance }: TradePanelHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-bold text-sm text-[var(--outline-black)] truncate">
        Trade {tokenSymbol || 'Token'}
      </h3>
      <div className="flex items-center gap-1 text-xs flex-shrink-0">
        <Wallet className="h-3 w-3 text-[var(--star-yellow)]" />
        <span className="font-mono font-bold text-[var(--outline-black)]">
          {formatSolAmount(balance)} SOL
        </span>
      </div>
    </div>
  )
}
