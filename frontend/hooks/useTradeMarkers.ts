/**
 * Hook for displaying user trade markers on the chart
 *
 * Features:
 * - Fetches user trades for a specific token
 * - Displays buy/sell arrows on the chart
 * - Shows quantity labels on markers
 */

import { useEffect } from 'react'
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
  tokenMint: string
) {
  const { getUserId } = useAuth()
  const userId = getUserId()

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

    const trades: Trade[] = tradesData.trades

    console.log(`📍 Adding ${trades.length} trade markers to chart`)

    const markers: SeriesMarker<Time>[] = trades.map((trade) => {
      const isBuy = trade.side === 'BUY'
      const quantity = parseFloat(trade.quantity)
      const timestamp = new Date(trade.timestamp).getTime() / 1000

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
        color: isBuy ? '#43B047' : '#E52521', // Luigi green / Mario red
        shape: isBuy ? 'arrowUp' : 'arrowDown',
        text: `${isBuy ? 'B' : 'S'} ${formattedQty}`,
        size: 1,
      }
    })

    candlestickSeries.setMarkers(markers)

    console.log(`✅ Applied ${markers.length} trade markers`)
  }, [candlestickSeries, tradesData])

  return {
    trades: tradesData?.trades || [],
    isLoading,
  }
}
