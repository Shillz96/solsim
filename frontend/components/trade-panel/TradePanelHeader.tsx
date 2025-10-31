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
      className="bg-gradient-to-br from-white/80 to-white/60 rounded-lg border-[3px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-2.5"
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Token Info with Icon */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[var(--mario-red)] flex items-center justify-center border-[2px] border-[var(--outline-black)] flex-shrink-0">
            <Coins className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] text-[var(--outline-black)]/60 font-semibold uppercase tracking-wide leading-tight">
              Trade
            </span>
            <h3 className="font-bold text-sm text-[var(--outline-black)] uppercase tracking-wide truncate leading-tight">
              {tokenSymbol || 'TOKEN'}
            </h3>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-1.5 flex-shrink-0 bg-[var(--coin-gold)] px-2 py-1.5 rounded-md border-[2px] border-[var(--outline-black)]">
          <Wallet className="h-3 w-3 text-[var(--outline-black)]" />
          <span className="font-mono font-bold text-[var(--outline-black)] text-xs whitespace-nowrap">
            {formatSolAmount(balance)}
          </span>
        </div>
      </div>
    </div>
  )
}
