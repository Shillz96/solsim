/**
 * Trade Panel Sell Tab Component
 * Sell interface with percentage presets, estimates, fees, and token vitals
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
    <div className="flex flex-col h-full space-y-1.5 mt-1">
      <Label className="mario-font text-[10px] whitespace-nowrap">
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
        className="w-full trade-action-btn trade-action-btn-sell h-12 whitespace-nowrap overflow-hidden"
        onClick={onSell}
        disabled={isTrading || !hasSelection}
      >
        {isTrading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0 relative z-10" />
            <span className="truncate relative z-10">SELLING...</span>
          </>
        ) : (
          <>
            <TrendingDown className="h-4 w-4 mr-2 flex-shrink-0 relative z-10" />
            <span className="truncate relative z-10">SELL {tokenSymbol}</span>
          </>
        )}
      </Button>

      {/* Token Vitals - 2x2 Grid - Fills remaining space */}
      <TokenVitalsBar
        tokenAddress={tokenAddress}
        volume24h={volume24h}
        holders={holders}
        userRank={userRank}
        className="flex-1 mt-2"
      />
    </div>
  )
}
