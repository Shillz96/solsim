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
  hasPosition
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
    <div className="flex flex-col gap-2.5 overflow-y-auto min-h-0">
      {/* Actions Section */}
      <div className="bg-gradient-to-br from-white/60 to-white/40 rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-2.5 space-y-2.5">
        <Label className="font-bold text-[9px] text-[var(--outline-black)]/60 uppercase tracking-wide">
          SELECT PERCENTAGE
        </Label>

        {/* Estimated SOL Display */}
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

        {/* Fee Display */}
        <TradePanelFees fees={fees || { estimatedFeeSol: 0, estimatedFeeUsd: 0, totalFeePercent: 1.5 }} />

        {/* Sell Button */}
        <Button
          className="w-full h-10 whitespace-nowrap overflow-hidden bg-[var(--mario-red)] hover:bg-[var(--mario-red)]/90 text-white font-bold text-sm uppercase border-[3px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-lg active:shadow-[1px_1px_0_var(--outline-black)] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50"
          onClick={onSell}
          disabled={isTrading || !hasSelection}
        >
          {isTrading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 flex-shrink-0" />
              <span className="truncate">SELLING...</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span className="truncate">SELL {tokenSymbol}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
