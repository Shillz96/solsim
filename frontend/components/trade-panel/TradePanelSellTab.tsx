/**
 * Trade Panel Sell Tab Component
 * Sell interface with percentage presets, estimates, and fees
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
    <div className="space-y-1.5 mt-1">
      <Label className="mario-font text-[10px] whitespace-nowrap">
        SELECT PERCENTAGE
      </Label>

      {/* Estimated SOL Display */}
      {estimate && (
        <TradePanelEstimate
          type="sell"
          tokenSymbol={tokenSymbol}
          estimate={{ 
            sol: estimate.solAmount,
            tokens: estimate.tokenQuantity
          }}
        />
      )}

      {/* Percentage Preset Buttons */}
      <TradePanelPresets
        presets={sellPresets}
        selected={selectedPercentage}
        onSelect={onSelectPercentage}
        disabled={() => !hasPosition}
        label="percentage"
      />

      {/* Fee Display */}
      {fees && <TradePanelFees fees={fees} />}

      {/* Sell Button */}
      <Button
        className="w-full mario-btn mario-btn-red h-10 text-xs whitespace-nowrap overflow-hidden"
        onClick={onSell}
        disabled={isTrading || !hasSelection}
      >
        {isTrading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin mr-1 flex-shrink-0" />
            <span className="truncate">SELLING...</span>
          </>
        ) : (
          <>
            <TrendingDown className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">SELL {tokenSymbol}</span>
          </>
        )}
      </Button>
    </div>
  )
}
