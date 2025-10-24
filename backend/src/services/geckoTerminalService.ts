/**
 * GeckoTerminal OHLCV Polling Service
 *
 * Polls GeckoTerminal API for historical OHLCV data and caches it.
 * Free tier: 30 calls/minute
 *
 * Architecture:
 * 1. Poll every 60s for active pools
 * 2. Cache in-memory with LRU
 * 3. Serve from cache to all clients
 */

import axios from 'axios'
import { LRUCache } from 'lru-cache'
import { loggers } from '../utils/logger.js'

const logger = loggers.priceService

interface OHLCVCandle {
  time: number       // Unix timestamp
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface CachedOHLCV {
  mint: string
  poolAddress: string
  timeframe: string
  candles: OHLCVCandle[]
  lastUpdated: number
}

interface PoolMapping {
  mint: string
  poolAddress: string
  dex: string
}

/**
 * GeckoTerminal API client with polling and caching
 */
export class GeckoTerminalService {
  private cache: LRUCache<string, CachedOHLCV>
  private poolMappings: Map<string, PoolMapping> // mint -> pool address
  private activePools: Set<string> // Pool addresses currently being tracked
  private pollingInterval: NodeJS.Timeout | null = null
  private readonly POLL_INTERVAL = 60000 // 60 seconds
  private readonly MAX_POOLS = 20 // Stay under 30 rpm limit
  private readonly RATE_LIMIT_RPM = 30
  private requestQueue: Array<() => Promise<void>> = []
  private isProcessingQueue = false

  constructor() {
    // LRU cache: 100 entries, 5 minute TTL
    this.cache = new LRUCache<string, CachedOHLCV>({
      max: 100,
      ttl: 5 * 60 * 1000, // 5 minutes
    })

    this.poolMappings = new Map()
    this.activePools = new Set()
  }

  /**
   * Start the polling service
   */
  start() {
    if (this.pollingInterval) {
      logger.warn('GeckoTerminal polling already started')
      return
    }

    logger.info('🦎 Starting GeckoTerminal OHLCV polling service')

    // Initial poll
    this.pollActivePools()

    // Poll every 60 seconds
    this.pollingInterval = setInterval(() => {
      this.pollActivePools()
    }, this.POLL_INTERVAL)
  }

  /**
   * Stop the polling service
   */
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
      logger.info('GeckoTerminal polling stopped')
    }
  }

  /**
   * Track a token for OHLCV updates
   * @param mint - Token mint address
   */
  async trackToken(mint: string) {
    // Check if we already have the pool mapping
    if (this.poolMappings.has(mint)) {
      const mapping = this.poolMappings.get(mint)!
      this.activePools.add(mapping.poolAddress)
      return
    }

    // Get pool address from DexScreener
    try {
      const pool = await this.getPoolAddress(mint)
      if (pool) {
        this.poolMappings.set(mint, pool)
        this.activePools.add(pool.poolAddress)
        logger.info({ mint: mint.slice(0, 8), pool: pool.poolAddress.slice(0, 8) }, 'Tracking new pool for OHLCV')

        // Immediately fetch OHLCV for this pool
        await this.fetchOHLCV(pool.poolAddress, mint, '1m')
      }
    } catch (error: any) {
      logger.error({ mint: mint.slice(0, 8), error: error.message }, 'Failed to get pool address')
    }
  }

  /**
   * Get pool address from DexScreener
   */
  private async getPoolAddress(mint: string): Promise<PoolMapping | null> {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
        { timeout: 5000 }
      )

      if (response.data?.pairs && response.data.pairs.length > 0) {
        // Get the most liquid pair on Solana
        const pair = response.data.pairs
          .filter((p: any) => p.chainId === 'solana')
          .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]

        if (pair?.pairAddress) {
          return {
            mint,
            poolAddress: pair.pairAddress,
            dex: pair.dexId || 'unknown'
          }
        }
      }

      return null
    } catch (error: any) {
      logger.warn({ mint: mint.slice(0, 8), error: error.message }, 'Failed to fetch pool from DexScreener')
      return null
    }
  }

  /**
   * Poll all active pools for OHLCV updates
   */
  private async pollActivePools() {
    const pools = Array.from(this.activePools).slice(0, this.MAX_POOLS)

    if (pools.length === 0) {
      return
    }

    logger.debug({ poolCount: pools.length }, 'Polling GeckoTerminal for OHLCV updates')

    // Fetch OHLCV for each pool (rate limited)
    for (const poolAddress of pools) {
      // Find mint for this pool
      const entry = Array.from(this.poolMappings.entries())
        .find(([_, mapping]) => mapping.poolAddress === poolAddress)

      if (entry) {
        const [mint] = entry
        await this.queueRequest(() => this.fetchOHLCV(poolAddress, mint, '1m'))
      }
    }
  }

  /**
   * Queue a request to respect rate limits
   */
  private async queueRequest(fn: () => Promise<void>) {
    this.requestQueue.push(fn)

    if (!this.isProcessingQueue) {
      this.processQueue()
    }
  }

  /**
   * Process request queue with rate limiting
   */
  private async processQueue() {
    this.isProcessingQueue = true

    const delayBetweenRequests = (60 * 1000) / this.RATE_LIMIT_RPM // ~2 seconds

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (request) {
        try {
          await request()
        } catch (error) {
          // Error already logged in fetchOHLCV
        }

        // Wait before next request
        if (this.requestQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests))
        }
      }
    }

    this.isProcessingQueue = false
  }

  /**
   * Fetch OHLCV data from GeckoTerminal
   */
  private async fetchOHLCV(poolAddress: string, mint: string, timeframe: string) {
    try {
      // Map timeframe to GeckoTerminal aggregate param
      const aggregateMap: Record<string, string> = {
        '1m': 'minute',
        '5m': 'minute',
        '15m': 'minute',
        '1h': 'hour',
        '4h': 'hour',
        '1d': 'day'
      }

      const aggregate = aggregateMap[timeframe] || 'minute'
      const limit = 500 // Max candles

      const response = await axios.get(
        `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${aggregate}`,
        {
          params: { aggregate: 1, limit },
          timeout: 8000
        }
      )

      if (response.data?.data?.attributes?.ohlcv_list) {
        const candles: OHLCVCandle[] = response.data.data.attributes.ohlcv_list.map((item: number[]) => ({
          time: item[0],
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[5]
        }))

        // Cache the result
        const cacheKey = `${mint}:${timeframe}`
        this.cache.set(cacheKey, {
          mint,
          poolAddress,
          timeframe,
          candles,
          lastUpdated: Date.now()
        })

        logger.debug({
          mint: mint.slice(0, 8),
          pool: poolAddress.slice(0, 8),
          candles: candles.length
        }, 'Cached GeckoTerminal OHLCV')
      }
    } catch (error: any) {
      logger.warn({
        pool: poolAddress.slice(0, 8),
        error: error.message
      }, 'Failed to fetch OHLCV from GeckoTerminal')
    }
  }

  /**
   * Get cached OHLCV data
   */
  getOHLCV(mint: string, timeframe: string): CachedOHLCV | null {
    const cacheKey = `${mint}:${timeframe}`
    const cached = this.cache.get(cacheKey)

    if (cached) {
      const age = Date.now() - cached.lastUpdated
      logger.debug({
        mint: mint.slice(0, 8),
        timeframe,
        candles: cached.candles.length,
        ageSeconds: Math.floor(age / 1000)
      }, 'Serving OHLCV from cache')
    }

    return cached || null
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      activePools: this.activePools.size,
      cachedEntries: this.cache.size,
      queuedRequests: this.requestQueue.length,
      isPolling: !!this.pollingInterval
    }
  }
}

// Singleton instance
export const geckoTerminalService = new GeckoTerminalService()
