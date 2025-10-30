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
    <div className="bg-gradient-to-r from-star/10 to-coin/10 border-3 border-outline rounded-xl p-3 shadow-[3px_3px_0_var(--outline-black)]">
      <div className="flex items-center justify-between">
        <h3 className="font-mario text-base text-outline uppercase tracking-wide truncate">
          Trade {tokenSymbol || 'Token'}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Wallet className="h-4 w-4 text-star" />
          <span className="font-mono font-bold text-outline text-sm">
            {formatSolAmount(balance)} SOL
          </span>
        </div>
      </div>
    </div>
  )
}
