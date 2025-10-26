/**
 * Position PnL Hook
 * Real-time PnL calculations for token positions
 */

import { useMemo } from 'react'
import { usePortfolio, usePosition } from '@/hooks/use-portfolio'
import { usePriceStreamContext } from '@/lib/price-stream-provider'
import { calculateRealtimePnL } from '../utils/calculations'
import type { RealtimePnL, PositionData } from '../types'

export function usePositionPnL(tokenAddress: string) {
  const tokenPosition = usePosition(tokenAddress)
  const { prices: livePrices } = usePriceStreamContext()
  
  // Get live price for this token
  const livePrice = livePrices.get(tokenAddress)
  
  // CRITICAL FIX: Use position's currentPrice as fallback while WebSocket is connecting
  // This prevents -100% PnL flash when page first loads
  const fallbackPrice = tokenPosition?.currentPrice ? parseFloat(tokenPosition.currentPrice) : 0
  const currentPrice = livePrice?.price || fallbackPrice
  
  // Calculate real-time PnL
  const realtimePnL: RealtimePnL | null = useMemo(() => {
    if (!tokenPosition) return null
    
    // Only calculate if we have a valid price (avoid -100% flash)
    if (currentPrice <= 0) return null
    
    const positionData: PositionData = {
      qty: tokenPosition.qty,
      avgCostUsd: tokenPosition.avgCostUsd,
      valueUsd: tokenPosition.valueUsd,
      unrealizedUsd: tokenPosition.unrealizedUsd,
      unrealizedPercent: tokenPosition.unrealizedPercent,
      currentPrice: tokenPosition.currentPrice || '0'
    }
    
    return calculateRealtimePnL(positionData, currentPrice)
  }, [tokenPosition, currentPrice])

  // Fallback to static PnL if no realtime data
  const displayPnL = realtimePnL || (tokenPosition ? {
    unrealizedPnL: parseFloat(tokenPosition.unrealizedUsd),
    unrealizedPercent: parseFloat(tokenPosition.unrealizedPercent),
    currentValue: parseFloat(tokenPosition.valueUsd),
    costBasis: parseFloat(tokenPosition.avgCostUsd) * parseFloat(tokenPosition.qty)
  } : null)
  
  // Safe values (prevent NaN/Infinity)
  const safePnL = displayPnL ? {
    unrealizedPnL: isFinite(displayPnL.unrealizedPnL) ? displayPnL.unrealizedPnL : 0,
    unrealizedPercent: isFinite(displayPnL.unrealizedPercent) ? displayPnL.unrealizedPercent : 0,
    currentValue: isFinite(displayPnL.currentValue) ? displayPnL.currentValue : 0,
    costBasis: isFinite(displayPnL.costBasis) ? displayPnL.costBasis : 0
  } : null

  return {
    position: tokenPosition,
    pnl: safePnL,
    currentPrice,
    hasPosition: !!tokenPosition && parseFloat(tokenPosition.qty) > 0
  }
}
