/**
 * Trade Panel Buy Tab Component
 * Buy interface with presets, custom input, estimates, fees, and token vitals
 * Updated to match Mario-themed card aesthetic
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
    <div className="flex flex-col gap-2.5 overflow-y-auto min-h-0">
      {/* Actions Section */}
      <div className="bg-gradient-to-br from-white/60 to-white/40 rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-2.5 space-y-2.5">
        <Label className="font-bold text-[9px] text-[var(--outline-black)]/60 uppercase tracking-wide">
          SELECT AMOUNT (SOL)
        </Label>

        {/* Estimated Tokens Display */}
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
            className="border-[2px] border-[var(--outline-black)] font-mono text-sm h-9 rounded-lg bg-white"
            autoComplete="off"
            data-form-type="other"
          />
        )}

        {/* Fee Display */}
        <TradePanelFees fees={fees || { estimatedFeeSol: 0, estimatedFeeUsd: 0, totalFeePercent: 1.5 }} />

        {/* Buy Button */}
        <Button
          className="w-full h-10 whitespace-nowrap overflow-hidden bg-[var(--luigi-green)] hover:bg-[var(--luigi-green)]/90 text-white font-bold text-sm uppercase border-[3px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-lg active:shadow-[1px_1px_0_var(--outline-black)] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50"
          onClick={onBuy}
          disabled={isTrading || !hasAmount}
        >
          {isTrading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 flex-shrink-0" />
              <span className="truncate">BUYING...</span>
            </>
          ) : (
            <>
              <TrendingUp className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span className="truncate">BUY {tokenSymbol}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
