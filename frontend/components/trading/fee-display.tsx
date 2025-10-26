"use client"

import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"

interface FeeDisplayProps {
  solAmount: number
  solPrice: number
  className?: string
  variant?: 'buy' | 'sell'
}

// Fee structure for real trading
// DEX fees vary by platform: Raydium (0.25%), Orca (0.3%), Jupiter (dynamic)
// Network fees: ~0.000005 SOL per transaction
// PumpPortal fees: 0.5-1% for token swaps

export function FeeDisplay({
  solAmount,
  solPrice,
  className,
  variant = 'buy'
}: FeeDisplayProps) {
  if (solAmount <= 0 || solPrice <= 0) {
    return null
  }

  // Calculate fees
  const dexFeePercent = 0.0025 // 0.25% Raydium standard fee
  const pumpPortalFeePercent = 0.01 // 1% PumpPortal fee (max)
  const networkFeeSol = 0.000005 // ~0.000005 SOL per tx

  const dexFeeSol = solAmount * dexFeePercent
  const pumpPortalFeeSol = solAmount * pumpPortalFeePercent
  const totalFeeSol = dexFeeSol + pumpPortalFeeSol + networkFeeSol

  const totalFeeUsd = totalFeeSol * solPrice

  return (
    <div className={cn(
      "flex items-center justify-between gap-2 px-3 py-1.5",
      "bg-background/50 border-2 border-outline/20",
      "rounded",
      className
    )}>
      <div className="flex items-center gap-1.5">
        <Info className="h-3 w-3 text-outline/60" />
        <span className="text-[10px] font-bold text-outline/70 uppercase">
          Est. Fees
        </span>
      </div>

      <div className="flex flex-col items-end">
        <div className="font-mono text-[11px] font-extrabold text-outline">
          {totalFeeSol.toFixed(6)} SOL
        </div>
        <div className="text-[9px] text-outline/60">
          {formatSolEquivalent(totalFeeUsd, solPrice)}
        </div>
      </div>
    </div>
  )
}

// Detailed Fee Breakdown (for hover/tooltip)
export function FeeBreakdown({
  solAmount,
  solPrice
}: {
  solAmount: number
  solPrice: number
}) {
  const dexFeePercent = 0.0025
  const pumpPortalFeePercent = 0.01
  const networkFeeSol = 0.000005

  const dexFeeSol = solAmount * dexFeePercent
  const pumpPortalFeeSol = solAmount * pumpPortalFeePercent

  return (
    <div className="space-y-1.5 text-[10px]">
      <div className="flex justify-between gap-4">
        <span className="text-outline/70">DEX Fee (0.25%)</span>
        <span className="font-mono font-bold">{dexFeeSol.toFixed(6)} SOL</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-outline/70">PumpPortal (1%)</span>
        <span className="font-mono font-bold">{pumpPortalFeeSol.toFixed(6)} SOL</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-outline/70">Network Fee</span>
        <span className="font-mono font-bold">{networkFeeSol.toFixed(6)} SOL</span>
      </div>
      <div className="border-t border-outline/20 pt-1.5 flex justify-between gap-4 font-bold">
        <span className="text-outline">Total</span>
        <span className="font-mono">
          {(dexFeeSol + pumpPortalFeeSol + networkFeeSol).toFixed(6)} SOL
        </span>
      </div>
    </div>
  )
}
