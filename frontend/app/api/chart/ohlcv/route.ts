/**
 * Chart OHLCV API Route (Next.js Fallback)
 *
 * This is a fallback for when the backend isn't running.
 * Generates mock OHLCV data for chart display.
 *
 * TODO: Remove this once backend is deployed on Railway
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * GET /api/chart/ohlcv
 *
 * Query params:
 * - mint: Token mint address
 * - type: Timeframe ('1m', '5m', '15m', '1h', '4h', '1d')
 * - limit: Number of candles (default: 500)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mint = searchParams.get('mint')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '500')

  if (!mint) {
    return NextResponse.json(
      { success: false, error: 'Missing required parameter: mint' },
      { status: 400 }
    )
  }

  if (!type) {
    return NextResponse.json(
      { success: false, error: 'Missing required parameter: type' },
      { status: 400 }
    )
  }

  // Validate timeframe
  const validTimeframes = ['1s', '1m', '5m', '15m', '1h', '4h', '1d']
  if (!validTimeframes.includes(type)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`,
      },
      { status: 400 }
    )
  }

  // Generate mock OHLCV data
  const timeFrom = Math.floor(Date.now() / 1000) - getSecondsForTimeframe(type, limit)
  const timeTo = Math.floor(Date.now() / 1000)

  const mockData = generateMockOHLCV(limit, type, timeFrom, timeTo)

  return NextResponse.json(
    {
      success: true,
      data: mockData,
      timeframe: type,
      from: timeFrom,
      to: timeTo,
      source: 'mock',
      warning: 'Using Next.js mock data - Backend not available',
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=30',
      },
    }
  )
}

/**
 * Calculate seconds for timeframe
 */
function getSecondsForTimeframe(type: string, limit: number): number {
  const multipliers: Record<string, number> = {
    '1s': 1,
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
  }

  return (multipliers[type] || 300) * limit
}

/**
 * Generate realistic mock OHLCV data
 */
function generateMockOHLCV(limit: number, type: string, timeFrom: number, timeTo: number) {
  const interval = getSecondsForTimeframe(type, 1) // Interval for one candle
  const items = []

  // Start with a realistic memecoin price
  let basePrice = 0.00001 + Math.random() * 0.0001
  const volatility = 0.03 // 3% volatility per candle

  for (let i = 0; i < limit; i++) {
    const time = timeFrom + i * interval

    // Random walk with slight upward bias for visual appeal
    const change = (Math.random() - 0.47) * volatility
    const open = basePrice
    const close = basePrice * (1 + change)

    // High and low based on open/close with wicks
    const high = Math.max(open, close) * (1 + Math.random() * 0.015)
    const low = Math.min(open, close) * (1 - Math.random() * 0.015)

    // Random volume with occasional spikes
    const volumeBase = 5000 + Math.random() * 20000
    const volume = Math.random() > 0.9 ? volumeBase * (2 + Math.random() * 3) : volumeBase

    items.push({
      unixTime: time,
      o: open.toFixed(10),
      h: high.toFixed(10),
      l: low.toFixed(10),
      c: close.toFixed(10),
      v: volume.toFixed(2),
    })

    basePrice = close
  }

  return { items }
}
