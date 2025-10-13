'use client'

import { memo } from 'react'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { formatSolEquivalent } from '@/lib/sol-equivalent-utils'
import { cn } from '@/lib/utils'

interface PriceDisplayProps {
  currentPrice: number
  solPrice: number
  priceChange24h?: number
  className?: string
  showChange?: boolean
}

/**
 * Memoized price display component that only re-renders when price changes significantly
 * Prevents unnecessary re-renders from WebSocket price updates
 */
export const PriceDisplay = memo(function PriceDisplay({
  currentPrice,
  solPrice,
  priceChange24h,
  className,
  showChange = true
}: PriceDisplayProps) {
  return (
    <div className={cn("flex flex-col items-end", className)}>
      <AnimatedNumber
        value={currentPrice}
        prefix="$"
        decimals={8}
        className="font-mono text-2xl font-bold text-foreground"
        colorize={false}
        glowOnChange={true}
      />
      {solPrice > 0 && (
        <div className="text-xs text-muted-foreground">
          {formatSolEquivalent(currentPrice, solPrice)}
        </div>
      )}
      {showChange && priceChange24h !== undefined && (
        <AnimatedNumber
          value={priceChange24h}
          suffix="%"
          prefix={priceChange24h >= 0 ? '+' : ''}
          decimals={2}
          className="text-sm font-medium"
          colorize={true}
          glowOnChange={true}
        />
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if price changed by more than 0.01%
  const threshold = 0.0001
  const priceChanged = Math.abs(prevProps.currentPrice - nextProps.currentPrice) / (prevProps.currentPrice || 1) > threshold
  const solPriceChanged = Math.abs(prevProps.solPrice - nextProps.solPrice) / (prevProps.solPrice || 1) > threshold
  const changeChanged = prevProps.priceChange24h !== nextProps.priceChange24h
  
  return !priceChanged && !solPriceChanged && !changeChanged && 
         prevProps.className === nextProps.className && 
         prevProps.showChange === nextProps.showChange
})

interface TokenHoldingsDisplayProps {
  tokenBalance: number
  tokenSymbol: string
  currentValue: number
  solPrice: number
  className?: string
}

/**
 * Memoized token holdings display
 */
export const TokenHoldingsDisplay = memo(function TokenHoldingsDisplay({
  tokenBalance,
  tokenSymbol,
  currentValue,
  solPrice,
  className
}: TokenHoldingsDisplayProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="text-sm text-muted-foreground">
        Holdings: {tokenBalance.toLocaleString()} {tokenSymbol}
      </div>
      <div className="text-xs text-muted-foreground">
        Value: ${currentValue.toFixed(2)}
        {solPrice > 0 && (
          <span className="ml-2">
            ≈ {formatSolEquivalent(currentValue, solPrice)}
          </span>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if values actually changed
  return prevProps.tokenBalance === nextProps.tokenBalance &&
         prevProps.tokenSymbol === nextProps.tokenSymbol &&
         Math.abs(prevProps.currentValue - nextProps.currentValue) < 0.01 &&
         Math.abs(prevProps.solPrice - nextProps.solPrice) < 0.01 &&
         prevProps.className === nextProps.className
})
