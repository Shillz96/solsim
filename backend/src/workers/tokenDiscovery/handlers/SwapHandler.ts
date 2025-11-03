/**
 * Swap Event Handler
 *
 * Handles swap events from PumpPortal stream
 * Extracted from tokenDiscoveryWorker.ts (lines 529-633)
 */

import Redis from 'ioredis';
import { loggers } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import priceServiceClient from '../../../plugins/priceServiceClient.js';
import { validateAndConvertTimestamp } from '../utils/timestampUtils.js';
import { ITxCountManager, IEventHandler, SwapEventData } from '../types.js';

const logger = loggers.server;

export class SwapHandler implements IEventHandler<SwapEventData> {
  constructor(
    private redis: Redis,
    private txCountManager: ITxCountManager
  ) {}

  async handle(event: SwapEventData): Promise<void> {
    try {
      const { mint, timestamp, txType, solAmount, tokenAmount, user } = event;

      // Validate and convert timestamp
      const tradeDate = validateAndConvertTimestamp(timestamp, mint);

      // Store trade in Redis for market data panel
      await this.storeTradeData(mint, event, timestamp);

      // Calculate and cache price from swap event
      await this.calculateAndCachePrice(mint, solAmount, tokenAmount, txType);

      // Update trader stats for leaderboard
      if (user) {
        await this.updateTraderStats(mint, user, txType, solAmount);
      }

      // Track transaction count
      const txId = `${mint}-${timestamp}`;
      this.txCountManager.addTransaction(mint, txId);
    } catch (error) {
      logger.error({ error }, 'Error handling swap event');
    }
  }

  /**
   * Store trade data in Redis (keep last 50 trades per token)
   */
  private async storeTradeData(
    mint: string,
    event: SwapEventData,
    timestamp: number
  ): Promise<void> {
    const { txType, solAmount, tokenAmount, user } = event;

    const tradeData = {
      type: txType,
      solAmount,
      tokenAmount,
      user,
      timestamp,
    };

    // Add to sorted set (score = timestamp)
    await this.redis.zadd(
      `market:trades:${mint}`,
      timestamp,
      JSON.stringify(tradeData)
    );

    // Keep only last 50 trades
    await this.redis.zremrangebyrank(`market:trades:${mint}`, 0, -51);

    // Expire after configured TTL
    await this.redis.expire(`market:trades:${mint}`, config.cache.TRADE_TTL);
  }

  /**
   * Calculate price from swap and cache in Redis
   */
  private async calculateAndCachePrice(
    mint: string,
    solAmount?: number,
    tokenAmount?: number,
    txType?: string
  ): Promise<void> {
    if (!solAmount || !tokenAmount || solAmount <= 0 || tokenAmount <= 0) {
      return;
    }

    const priceSol = solAmount / tokenAmount; // SOL per token
    const solPriceUsd = priceServiceClient.getSolPrice(); // Get SOL/USD price
    const priceUsd = priceSol * solPriceUsd; // USD per token

    if (priceUsd > 0 && solPriceUsd > 0) {
      // Cache in Redis for main API
      const priceTick = {
        mint,
        priceUsd,
        priceSol,
        solUsd: solPriceUsd,
        timestamp: Date.now(),
        source: 'pumpportal-swap',
      };

      await this.redis.setex(`prices:${mint}`, config.cache.PRICE_TTL, JSON.stringify(priceTick));

      logger.debug({
        mint: mint.slice(0, 8),
        priceUsd: priceUsd.toFixed(8),
        txType,
      }, 'Updated price from swap event');
    }
  }

  /**
   * Update trader stats for leaderboard
   */
  private async updateTraderStats(
    mint: string,
    user: string,
    txType: string,
    solAmount?: number
  ): Promise<void> {
    const traderKey = `market:traders:${mint}`;
    const existingData = await this.redis.hget(traderKey, user);
    const traderStats = existingData
      ? JSON.parse(existingData)
      : {
          buyVolume: 0,
          sellVolume: 0,
          trades: 0,
        };

    if (txType === 'buy') {
      traderStats.buyVolume += solAmount || 0;
    } else {
      traderStats.sellVolume += solAmount || 0;
    }
    traderStats.trades += 1;
    traderStats.pnl = traderStats.sellVolume - traderStats.buyVolume; // Simple PnL estimate

    await this.redis.hset(traderKey, user, JSON.stringify(traderStats));
    await this.redis.expire(traderKey, config.cache.TRADER_STATS_TTL);
  }
}
