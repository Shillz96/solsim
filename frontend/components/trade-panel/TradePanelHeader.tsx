/**
 * Trade Panel Header Component
 * Displays token symbol and user balance
 * Matches Mario-themed card aesthetic from reference design
 */

import { Wallet, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSolAmount } from './utils/formatters'

interface TradePanelHeaderProps {
  tokenSymbol: string | null
  balance: number
}

export function TradePanelHeader({ tokenSymbol, balance }: TradePanelHeaderProps) {
  return (
    <div 
      className="bg-[var(--card)] rounded-xl border-[3px] border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] p-4"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Token Info with Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--mario-red)] flex items-center justify-center border-[2px] border-[var(--outline-black)] flex-shrink-0">
            <Coins className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--outline-black)]/60 font-semibold uppercase tracking-wide">
              Trade
            </span>
            <h3 className="font-bold text-lg text-[var(--outline-black)] uppercase tracking-wide truncate leading-tight">
              {tokenSymbol || 'TOKEN'}
            </h3>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 flex-shrink-0 bg-[var(--star-yellow)] px-3 py-2 rounded-lg border-[2px] border-[var(--outline-black)]">
          <Wallet className="h-4 w-4 text-[var(--outline-black)]" />
          <span className="font-mono font-bold text-[var(--outline-black)] text-sm whitespace-nowrap">
            {formatSolAmount(balance)} SOL
          </span>
        </div>
      </div>
    </div>
  )
}
