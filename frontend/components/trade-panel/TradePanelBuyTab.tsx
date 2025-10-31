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
    <div className="flex flex-col gap-4 h-full">
      {/* Actions Section */}
      <div className="bg-[var(--card)] rounded-xl border-[3px] border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] p-4 space-y-4">
        <Label className="font-bold text-xs text-[var(--outline-black)]/60 uppercase tracking-wide">
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
            className="border-[3px] border-[var(--outline-black)] font-mono text-sm h-11 rounded-lg"
            autoComplete="off"
            data-form-type="other"
          />
        )}

        {/* Fee Display - Always visible */}
        <TradePanelFees fees={fees || { estimatedFeeSol: 0, estimatedFeeUsd: 0, totalFeePercent: 1.5 }} />

        {/* Buy Button */}
        <Button
          className="w-full h-12 whitespace-nowrap overflow-hidden bg-[var(--luigi-green)] hover:bg-[var(--luigi-green)]/90 text-white font-bold uppercase border-[3px] border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg active:shadow-[1px_1px_0_var(--outline-black)] active:translate-x-[2px] active:translate-y-[2px] transition-all"
          onClick={onBuy}
          disabled={isTrading || !hasAmount}
        >
          {isTrading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2 flex-shrink-0" />
              <span className="truncate">BUYING...</span>
            </>
          ) : (
            <>
              <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">BUY {tokenSymbol}</span>
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
