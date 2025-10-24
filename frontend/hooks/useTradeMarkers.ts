/**
 * Hook for displaying user trade markers on the chart
 *
 * Features:
 * - Fetches user trades for a specific token
 * - Displays buy/sell circular bubbles on the chart (axiom.trade style)
 * - Shows quantity labels on markers
 * - Different colors for paper vs real SOL trades
 * - Size scales with trade volume
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ISeriesApi, SeriesMarker, Time } from 'lightweight-charts'
import { useAuth } from './use-auth'

interface Trade {
  id: string
  side: 'BUY' | 'SELL'
  quantity: string
  price: string
  timestamp: Date
  totalCost: string
  tradeMode: string
}

export function useTradeMarkers(
  candlestickSeries: ISeriesApi<'Candlestick'> | null,
  tokenMint: string,
  showMarkers: boolean = true // Allow toggling markers visibility
) {
  const { getUserId } = useAuth()
  const userId = getUserId()
  const [hideBubbles, setHideBubbles] = useState(false)

  // Fetch user trades for this token
  const { data: tradesData, isLoading } = useQuery({
    queryKey: ['user-trades-chart', userId, tokenMint],
    queryFn: async () => {
      if (!userId) return null

      const response = await fetch(
        `/api/trades/user/${userId}/token/${tokenMint}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch user trades')
      }

      return response.json()
    },
    enabled: !!userId && !!tokenMint && !!candlestickSeries,
    refetchOnWindowFocus: false,
    staleTime: 60000, // Cache for 1 minute
  })

  // Apply markers to chart when trades data changes
  useEffect(() => {
    if (!candlestickSeries || !tradesData?.success || !tradesData.trades) {
      return
    }

    // If hide bubbles is active or showMarkers is false, clear markers
    if (hideBubbles || !showMarkers) {
      // Use type assertion - setMarkers exists in v5 but TypeScript types don't expose it
      ;(candlestickSeries as any).setMarkers([])
      return
    }

    const trades: Trade[] = tradesData.trades

    console.log(`📍 Adding ${trades.length} trade markers to chart`)

    const markers: SeriesMarker<Time>[] = trades.map((trade) => {
      const isBuy = trade.side === 'BUY'
      const isPaper = trade.tradeMode === 'PAPER'
      const quantity = parseFloat(trade.quantity)
      const timestamp = new Date(trade.timestamp).getTime() / 1000
      const totalCost = parseFloat(trade.totalCost)

      // Determine marker size based on trade volume (1-3 scale)
      let size = 1
      if (totalCost > 10) size = 2 // Medium trades > 10 SOL
      if (totalCost > 50) size = 3 // Large trades > 50 SOL

      // Colors: Match axiom.trade style with distinction for paper/real
      let color: string
      if (isBuy) {
        color = isPaper ? '#26a69a' : '#00d9b8' // Teal (paper) vs brighter teal (real)
      } else {
        color = isPaper ? '#ef5350' : '#ff6b6b' // Red (paper) vs brighter red (real)
      }

      // Format quantity for display (e.g., "1.2K" or "500")
      const formattedQty =
        quantity >= 1000
          ? `${(quantity / 1000).toFixed(1)}K`
          : quantity >= 1
          ? quantity.toFixed(0)
          : quantity.toFixed(2)

      return {
        time: Math.floor(timestamp) as Time,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color,
        shape: 'circle', // Circular bubbles like axiom
        text: isBuy ? 'B' : 'S', // Just B or S, no quantity (cleaner)
        size,
      }
    })

    // Use TradingView v5 API (setMarkers exists but TypeScript types don't expose it)
    ;(candlestickSeries as any).setMarkers(markers)

    console.log(`✅ Applied ${markers.length} trade markers`)
  }, [candlestickSeries, tradesData, hideBubbles, showMarkers])

  return {
    trades: tradesData?.trades || [],
    isLoading,
    hideBubbles,
    toggleBubbles: () => setHideBubbles((prev) => !prev),
  }
}
