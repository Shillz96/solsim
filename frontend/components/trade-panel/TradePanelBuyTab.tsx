/**
 * Trade Panel Buy Tab Component
 * Buy interface with presets, custom input, estimates, fees, and token vitals
 */

import { TrendingUp, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TradePanelPresets } from './TradePanelPresets'
import { TradePanelEstimate } from './TradePanelEstimate'
import { TradePanelFees } from './TradePanelFees'
import { TokenVitalsBar } from '@/components/trading/token-vitals-bar'
import { calculateBuyEstimate, calculateTradeFees } from './utils/calculations'

interface TradePanelBuyTabProps {
  // Presets
  buyPresets: number[]
  onUpdatePreset: (index: number, value: number) => void

  // State
  selectedSolAmount: number | null
  customSolAmount: string
  showCustomInput: boolean
  onSelectAmount: (amount: number) => void
  onCustomAmountChange: (amount: string) => void
  onToggleCustomInput: (show: boolean) => void

  // Trade execution
  onBuy: () => void
  isTrading: boolean

  // Token data
  tokenSymbol: string | null
  currentPrice: number
  solPrice: number
  balance: number

  // Token vitals data
  tokenAddress?: string
  volume24h?: number
  holders?: number
  userRank?: number | null
}

export function TradePanelBuyTab({
  buyPresets,
  onUpdatePreset,
  selectedSolAmount,
  customSolAmount,
  showCustomInput,
  onSelectAmount,
  onCustomAmountChange,
  onToggleCustomInput,
  onBuy,
  isTrading,
  tokenSymbol,
  currentPrice,
  solPrice,
  balance,
  tokenAddress,
  volume24h,
  holders,
  userRank
}: TradePanelBuyTabProps) {
  const solAmount = selectedSolAmount || parseFloat(customSolAmount) || 0
  const hasAmount = solAmount > 0
  
  // Calculate estimates
  const estimate = hasAmount && currentPrice > 0 && solPrice > 0
    ? calculateBuyEstimate(solAmount, solPrice, currentPrice)
    : null
    
  const fees = hasAmount ? calculateTradeFees(solAmount, solPrice) : null
  
  return (
    <div className="flex flex-col h-full space-y-4 mt-3">
      <Label className="mario-font text-[10px] whitespace-nowrap">
        SELECT AMOUNT (SOL)
      </Label>

      {/* Estimated Tokens Display - Always visible */}
      <TradePanelEstimate
        type="buy"
        tokenSymbol={tokenSymbol || 'TOKEN'}
        estimate={{ tokens: estimate?.tokenQuantity || 0 }}
      />

      {/* Preset Buttons */}
      <TradePanelPresets
        presets={buyPresets}
        selected={selectedSolAmount}
        onSelect={onSelectAmount}
        onUpdate={onUpdatePreset}
        disabled={(amount) => amount > balance}
        maxValue={balance}
        editable={true}
      />

      {/* Custom Input (Optional) */}
      {showCustomInput && (
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Custom amount"
          value={customSolAmount}
          onChange={(e) => onCustomAmountChange(e.target.value)}
          className="border-2 border-outline font-mono text-sm h-11"
          autoComplete="off"
          data-form-type="other"
        />
      )}

      {/* Fee Display - Always visible */}
      <TradePanelFees fees={fees || { estimatedFeeSol: 0, estimatedFeeUsd: 0, totalFeePercent: 1.5 }} />

      {/* Buy Button */}
      <Button
        className="w-full trade-action-btn trade-action-btn-buy h-12 whitespace-nowrap overflow-hidden"
        onClick={onBuy}
        disabled={isTrading || !hasAmount}
      >
        {isTrading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0 relative z-10" />
            <span className="truncate relative z-10">BUYING...</span>
          </>
        ) : (
          <>
            <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0 relative z-10" />
            <span className="truncate relative z-10">BUY {tokenSymbol}</span>
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
