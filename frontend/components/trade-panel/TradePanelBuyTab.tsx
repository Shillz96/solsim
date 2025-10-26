/**
 * Trade Panel Buy Tab Component
 * Buy interface with presets, custom input, estimates, and fees
 */

import { TrendingUp, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TradePanelPresets } from './TradePanelPresets'
import { TradePanelEstimate } from './TradePanelEstimate'
import { TradePanelFees } from './TradePanelFees'
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
  balance
}: TradePanelBuyTabProps) {
  const solAmount = selectedSolAmount || parseFloat(customSolAmount) || 0
  const hasAmount = solAmount > 0
  
  // Calculate estimates
  const estimate = hasAmount && currentPrice > 0 && solPrice > 0
    ? calculateBuyEstimate(solAmount, solPrice, currentPrice)
    : null
    
  const fees = hasAmount ? calculateTradeFees(solAmount, solPrice) : null
  
  return (
    <div className="space-y-1.5 mt-1">
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
          placeholder="Custom amount"
          value={customSolAmount}
          onChange={(e) => onCustomAmountChange(e.target.value)}
          className="border-2 border-[var(--outline-black)] font-mono text-sm h-8"
        />
      )}

      {/* Fee Display - Always visible */}
      <TradePanelFees fees={fees || { estimatedFeeSol: 0, estimatedFeeUsd: 0, totalFeePercent: 1.5 }} />

      {/* Buy Button */}
      <Button
        className="w-full mario-btn mario-btn-green h-10 text-xs whitespace-nowrap overflow-hidden"
        onClick={onBuy}
        disabled={isTrading || !hasAmount}
      >
        {isTrading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin mr-1 flex-shrink-0" />
            <span className="truncate">BUYING...</span>
          </>
        ) : (
          <>
            <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">BUY {tokenSymbol}</span>
          </>
        )}
      </Button>
    </div>
  )
}
