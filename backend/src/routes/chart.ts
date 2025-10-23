/**
 * Chart Data Routes
 *
 * Provides historical OHLCV data from Birdeye API
 */

import { FastifyInstance } from 'fastify'
import axios from 'axios'

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

        // Try Birdeye OHLCV V3 API first
        const birdeyeApiKey = process.env.BIRDEYE_API_KEY

        if (birdeyeApiKey) {
          try {
            const response = await axios.get(
              'https://public-api.birdeye.so/defi/v3/ohlcv',
              {
                headers: {
                  'X-API-KEY': birdeyeApiKey,
                },
                params: {
                  address: mint,
                  type,
                  time_from: timeFrom,
                  time_to: timeTo,
                },
                timeout: 10000, // 10 second timeout
              }
            )

            // Check if successful
            if (response.data.success && response.data.data?.items) {
              // Cache for 30 seconds (OHLCV data doesn't change rapidly)
              reply.header('Cache-Control', 'public, max-age=30')

              return {
                success: true,
                data: response.data.data,
                timeframe: type,
                from: timeFrom,
                to: timeTo,
                source: 'birdeye',
              }
            }

            // Birdeye returned error (rate limit, etc)
            app.log.warn(`Birdeye API error: ${JSON.stringify(response.data)}`)
          } catch (birdeyeError: any) {
            app.log.warn(`Birdeye API failed: ${birdeyeError.message}`)
          }
        }

        // Fallback: Generate mock OHLCV data for now
        // TODO: Replace with DexScreener or another data source
        app.log.info('Generating mock OHLCV data (Birdeye unavailable)')

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
          warning: 'Using mock data - Birdeye API unavailable',
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
function generateMockOHLCV(limit: number, type: string, timeFrom: number, timeTo: number) {
  const interval = getSecondsForTimeframe(type, 1) // Interval for one candle
  const items = []

  // Start with a base price (realistic for memecoins)
  let basePrice = 0.00001 + Math.random() * 0.0001
  const volatility = 0.02 // 2% volatility per candle

  for (let i = 0; i < limit; i++) {
    const time = timeFrom + (i * interval)

    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * volatility
    const open = basePrice
    const close = basePrice * (1 + change)

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

    basePrice = close
  }

  return { items }
}
