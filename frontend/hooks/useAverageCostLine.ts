/**
 * Hook for displaying average cost price line on the chart
 *
 * Features:
 * - Displays horizontal yellow dashed line at average cost
 * - Shows label on price axis
 * - Automatically updates when position changes
 * - Only shows if user has an open position
 */

import { useEffect, useRef } from 'react'
import type { ISeriesApi, IPriceLine } from 'lightweight-charts'
import { usePosition } from './use-portfolio'

export function useAverageCostLine(
  candlestickSeries: ISeriesApi<'Candlestick'> | null,
  tokenMint: string,
  solPrice: number
) {
  const position = usePosition(tokenMint)
  const priceLineRef = useRef<IPriceLine | null>(null)

  useEffect(() => {
    if (!candlestickSeries) return

    // Remove existing price line if it exists
    if (priceLineRef.current) {
      candlestickSeries.removePriceLine(priceLineRef.current)
      priceLineRef.current = null
    }

    // Only show if user has a position
    if (!position || parseFloat(position.qty) === 0) {
      console.log('📏 No position, skipping average cost line')
      return
    }

    try {
      // Get average cost from position (already in USD)
      const avgCostUsd = parseFloat(position.avgCostUsd)

      if (isNaN(avgCostUsd) || avgCostUsd <= 0) {
        console.warn('⚠️ Invalid average cost:', position.avgCostUsd)
        return
      }

      console.log(`📏 Adding average cost line at $${avgCostUsd.toFixed(8)}`)

      // Create horizontal price line (axiom.trade style - green dashed)
      const priceLine = candlestickSeries.createPriceLine({
        price: avgCostUsd,
        color: '#26a69a', // Teal green to match buy markers
        lineWidth: 2,
        lineStyle: 2, // Dashed line
        axisLabelVisible: true,
        title: `Avg: $${avgCostUsd.toFixed(8)}`,
      })

      priceLineRef.current = priceLine

      console.log(`✅ Average cost line displayed`)
    } catch (error) {
      console.error('Failed to create average cost line:', error)
    }

    // Cleanup function
    return () => {
      if (priceLineRef.current && candlestickSeries) {
        try {
          candlestickSeries.removePriceLine(priceLineRef.current)
          priceLineRef.current = null
        } catch (error) {
          // Ignore errors during cleanup (chart might be destroyed)
        }
      }
    }
  }, [candlestickSeries, position, tokenMint, solPrice])

  return {
    hasPosition: !!position && parseFloat(position.qty) > 0,
    averageCost: position ? parseFloat(position.avgCostUsd) : 0,
  }
}
