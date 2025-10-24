/**
 * Chart Data Routes
 *
 * Provides historical OHLCV data from GeckoTerminal (free tier)
 * Falls back to DexScreener current price + estimates
 */

import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { geckoTerminalService } from '../services/geckoTerminalService.js'

interface OHLCVQueryParams {
  mint: string
  type: string // '1m', '5m', '15m', '1h', '4h', '1d'
  limit?: string
}

export default async function chartRoutes(app: FastifyInstance) {
  /**
   * GET /api/chart/ohlcv
   *
   * Fetch historical OHLCV data from Birdeye
   */
  app.get<{ Querystring: OHLCVQueryParams }>(
    '/chart/ohlcv',
    async (request, reply) => {
      const { mint, type, limit = '500' } = request.query

      if (!mint) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required parameter: mint',
        })
      }

      if (!type) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required parameter: type',
        })
      }

      // Validate timeframe
      const validTimeframes = ['1s', '15s', '30s', '1m', '5m', '15m', '1h', '4h', '1d']
      if (!validTimeframes.includes(type)) {
        return reply.code(400).send({
          success: false,
          error: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`,
        })
      }

      try {
        const limitNum = parseInt(limit)
        const timeFrom = Math.floor(Date.now() / 1000) - getSecondsForTimeframe(type, limitNum)
        const timeTo = Math.floor(Date.now() / 1000)

        app.log.info(`Fetching OHLCV for ${mint}, timeframe: ${type}, limit: ${limitNum}`)

        // Try GeckoTerminal cache first (free tier, 30 rpm)
        const geckoData = geckoTerminalService.getOHLCV(mint, type)

        if (geckoData && geckoData.candles.length > 0) {
          // Convert GeckoTerminal format to our format
          const items = geckoData.candles.map(candle => ({
            unixTime: candle.time,
            o: candle.open,
            h: candle.high,
            l: candle.low,
            c: candle.close,
            v: candle.volume
          }))

          // Cache for 55 seconds (just under 1 minute poll interval)
          reply.header('Cache-Control', 'public, s-maxage=55, stale-while-revalidate=60')

          app.log.info(`Serving OHLCV from GeckoTerminal cache (${items.length} candles)`)

          return {
            success: true,
            data: { items },
            timeframe: type,
            from: timeFrom,
            to: timeTo,
            source: 'geckoterminal',
          }
        }

        // Not in cache - track this token for future polls
        app.log.info(`Token ${mint.slice(0, 8)} not in cache, tracking for next poll...`)
        geckoTerminalService.trackToken(mint).catch(err => {
          app.log.warn(`Failed to track token: ${err.message}`)
        })

        // Fallback: Try DexScreener API (no API key needed!)
        app.log.info('Birdeye unavailable, trying DexScreener...')

        try {
          // DexScreener OHLCV endpoint (free, no API key)
          const dexResponse = await axios.get(
            `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
            { timeout: 8000 }
          )

          if (dexResponse.data?.pairs && dexResponse.data.pairs.length > 0) {
            // Get the most liquid pair
            const pair = dexResponse.data.pairs.sort((a: any, b: any) =>
              (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0]

            if (pair.priceUsd) {
              // Generate OHLCV from current price (simplified)
              app.log.info(`Using DexScreener price: $${pair.priceUsd}`)
              const currentPrice = parseFloat(pair.priceUsd)

              // Generate realistic-looking candles around current price
              const mockData = generateMockOHLCV(limitNum, type, timeFrom, timeTo, currentPrice)

              reply.header('Cache-Control', 'public, max-age=30')

              return {
                success: true,
                data: mockData,
                timeframe: type,
                from: timeFrom,
                to: timeTo,
                source: 'dexscreener-estimated',
                warning: 'Using estimated historical data based on current DexScreener price',
              }
            }
          }
        } catch (dexError: any) {
          app.log.warn(`DexScreener also failed: ${dexError.message}`)
        }

        // Last resort: Generate mock OHLCV data
        app.log.warn('All data sources failed, generating mock data')

        const mockData = generateMockOHLCV(limitNum, type, timeFrom, timeTo)

        // Cache for 30 seconds
        reply.header('Cache-Control', 'public, max-age=30')

        return {
          success: true,
          data: mockData,
          timeframe: type,
          from: timeFrom,
          to: timeTo,
          source: 'mock',
          warning: 'Using mock data - All data sources unavailable',
        }
      } catch (error: any) {
        app.log.error('Failed to fetch OHLCV:', error.message)

        // Handle specific error cases
        if (error.response?.status === 429) {
          return reply.code(429).send({
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
          })
        }

        if (error.response?.status === 404) {
          return reply.code(404).send({
            success: false,
            error: 'Token not found on Birdeye',
          })
        }

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          return reply.code(504).send({
            success: false,
            error: 'Request timeout. Birdeye API is slow to respond.',
          })
        }

        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch chart data',
          details: error.message,
        })
      }
    }
  )
}

/**
 * Calculate seconds for timeframe
 */
function getSecondsForTimeframe(type: string, limit: number): number {
  const multipliers: Record<string, number> = {
    '1s': 1,
    '15s': 15,
    '30s': 30,
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
 * Generate mock OHLCV data for fallback
 */
function generateMockOHLCV(
  limit: number,
  type: string,
  timeFrom: number,
  timeTo: number,
  basePrice: number = 0.00007 // Default price if not provided
) {
  const interval = getSecondsForTimeframe(type, 1) // Interval for one candle
  const items = []

  // Use provided base price (from DexScreener or default)
  let currentPrice = basePrice
  const volatility = 0.02 // 2% volatility per candle

  for (let i = 0; i < limit; i++) {
    const time = timeFrom + (i * interval)

    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * volatility
    const open = currentPrice
    const close = currentPrice * (1 + change)

    // High and low based on open/close
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)

    // Random volume
    const volume = 1000 + Math.random() * 10000

    items.push({
      unixTime: time,
      o: open,
      h: high,
      l: low,
      c: close,
      v: volume,
    })

    currentPrice = close // Update for next candle
  }

  return { items }
}
