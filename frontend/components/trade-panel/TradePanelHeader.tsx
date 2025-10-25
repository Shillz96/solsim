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
      <h3 className={cn(marioStyles.heading(4), 'text-xs truncate')}>
        TRADE {tokenSymbol || 'TOKEN'}
      </h3>
      <div className="flex items-center gap-1 text-xs flex-shrink-0">
        <Wallet className="h-3 w-3 text-[var(--star-yellow)]" />
        <span className={cn(marioStyles.bodyText('bold'), 'font-mono')}>
          {formatSolAmount(balance)} SOL
        </span>
      </div>
    </div>
  )
}
