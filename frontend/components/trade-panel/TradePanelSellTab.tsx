/**
 * Trade Panel Sell Tab Component
 * Sell interface with percentage presets, estimates, fees, and token vitals
 * Updated to match Mario-themed card aesthetic
 */

import { TrendingDown, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { TradePanelPresets } from './TradePanelPresets'
import { TradePanelEstimate } from './TradePanelEstimate'
import { TradePanelFees } from './TradePanelFees'
import { TokenVitalsBar } from '@/components/trading/token-vitals-bar'
import { calculateSellEstimate, calculateSellQuantity, calculateTradeFees } from './utils/calculations'

interface TradePanelSellTabProps {
  // Presets
  sellPresets: number[]

  // State
  selectedPercentage: number | null
  onSelectPercentage: (percentage: number) => void

  // Trade execution
  onSell: () => void
  isTrading: boolean

  // Position & token data
  tokenSymbol: string | null
  holdingQty: number
  currentPrice: number
  solPrice: number
  hasPosition: boolean

  // Token vitals data
  tokenAddress?: string
  volume24h?: number
  holders?: number
  userRank?: number | null
}

export function TradePanelSellTab({
  sellPresets,
  selectedPercentage,
  onSelectPercentage,
  onSell,
  isTrading,
  tokenSymbol,
  holdingQty,
  currentPrice,
  solPrice,
  hasPosition,
  tokenAddress,
  volume24h,
  holders,
  userRank
}: TradePanelSellTabProps) {
  const hasSelection = selectedPercentage !== null && hasPosition
  
  // Calculate estimates
  const tokenQuantity = hasSelection 
    ? calculateSellQuantity(holdingQty, selectedPercentage)
    : 0
    
  const estimate = hasSelection && currentPrice > 0 && solPrice > 0
    ? calculateSellEstimate(tokenQuantity, currentPrice, solPrice)
    : null
    
  const fees = estimate ? calculateTradeFees(estimate.solAmount, solPrice) : null
  
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Actions Section */}
      <div className="bg-[var(--card)] rounded-xl border-[3px] border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] p-4 space-y-4">
        <Label className="font-bold text-xs text-[var(--outline-black)]/60 uppercase tracking-wide">
          SELECT PERCENTAGE
        </Label>

        {/* Estimated SOL Display - Always visible */}
        <TradePanelEstimate
          type="sell"
          tokenSymbol={tokenSymbol || 'TOKEN'}
          estimate={{
            sol: estimate?.solAmount || 0,
            tokens: estimate?.tokenQuantity || 0
          }}
        />

        {/* Percentage Preset Buttons */}
        <TradePanelPresets
          presets={sellPresets}
          selected={selectedPercentage}
          onSelect={onSelectPercentage}
          disabled={() => !hasPosition}
          label="percentage"
        />

        {/* Fee Display - Always visible */}
        <TradePanelFees fees={fees || { estimatedFeeSol: 0, estimatedFeeUsd: 0, totalFeePercent: 1.5 }} />

        {/* Sell Button */}
        <Button
          className="w-full h-12 whitespace-nowrap overflow-hidden bg-[var(--mario-red)] hover:bg-[var(--mario-red)]/90 text-white font-bold uppercase border-[3px] border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg active:shadow-[1px_1px_0_var(--outline-black)] active:translate-x-[2px] active:translate-y-[2px] transition-all"
          onClick={onSell}
          disabled={isTrading || !hasSelection}
        >
          {isTrading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0" />
              <span className="truncate">SELLING...</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">SELL {tokenSymbol}</span>
            </>
          )}
        </Button>
      </div>

      {/* Meta Tier - Token Vitals */}
      <TokenVitalsBar
        tokenAddress={tokenAddress}
        volume24h={volume24h}
        holders={holders}
        userRank={userRank}
        className="flex-1"
      />
    </div>
  )
}
