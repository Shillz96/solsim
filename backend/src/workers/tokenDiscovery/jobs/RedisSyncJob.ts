/**
 * Redis Sync Job
 *
 * Batch sync Redis data to database (replaces real-time writes)
 * Runs every 60 minutes to persist accumulated price/trade data
 * Extracted from tokenDiscoveryWorker.ts (lines 1006-1091)
 */

import { Decimal } from '@prisma/client/runtime/library';
import { loggers, truncateWallet } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { IScheduledJob, WorkerDependencies } from '../types.js';

const logger = loggers.server;

export class RedisSyncJob implements IScheduledJob {
  constructor(private deps: WorkerDependencies) {}

  getName(): string {
    return 'redis_to_db_sync';
  }

  getInterval(): number {
    return config.intervals.REDIS_TO_DB_SYNC;
  }

  async run(): Promise<void> {
    try {
      logger.debug({ operation: this.getName() }, 'Starting batch sync from Redis to database');

      // 1. Sync buffered token data first (NEW)
      const tokensSynced = await this.deps.bufferManager.syncBufferedTokens();
      logger.info({ tokensSynced }, 'Buffered tokens synced');

      // 2. Sync price data from Redis (EXISTING)
      // Get all price keys from Redis
      const priceKeys = await this.deps.redis.keys('prices:*');

      if (priceKeys.length === 0) {
        logger.debug({ operation: this.getName() }, 'No prices to sync');
        return;
      }

      // Batch fetch all prices
      const pipeline = this.deps.redis.pipeline();
      for (const key of priceKeys) {
        pipeline.get(key);
      }
      const priceResults = await pipeline.exec();

      // Prepare batch updates
      const updates: Array<{ mint: string; priceUsd: Decimal; lastTradeTs: Date }> = [];

      for (let i = 0; i < priceKeys.length; i++) {
        const key = priceKeys[i];
        const result = priceResults?.[i];

        if (!result || result[0] || !result[1]) continue; // Skip errors or null values

        try {
          const mint = key.replace('prices:', '');
          const priceData = JSON.parse(result[1] as string);

          if (priceData.priceUsd && priceData.timestamp) {
            updates.push({
              mint,
              priceUsd: new Decimal(priceData.priceUsd),
              lastTradeTs: new Date(priceData.timestamp)
            });
          }
        } catch (err) {
          logger.warn({ key, error: err }, 'Failed to parse price data from Redis');
        }
      }

      if (updates.length === 0) {
        logger.debug({ operation: this.getName() }, 'No valid prices to sync');
        return;
      }

      // Execute batch update in a transaction
      let successCount = 0;
      await this.deps.prisma.$transaction(async (tx) => {
        for (const update of updates) {
          try {
            await tx.tokenDiscovery.updateMany({
              where: { mint: update.mint },
              data: {
                priceUsd: update.priceUsd,
                lastTradeTs: update.lastTradeTs,
                lastUpdatedAt: new Date()
              }
            });
            successCount++;
          } catch (err) {
            // Token might not exist in DB yet - skip silently
            logger.debug({ mint: truncateWallet(update.mint) }, 'Token not in database, skipping price update');
          }
        }
      });

      logger.info({
        total: priceKeys.length,
        updated: successCount,
        operation: this.getName()
      }, 'Completed batch sync from Redis to database');

    } catch (error) {
      logger.error({ error, operation: this.getName() }, 'Error in job');
    }
  }
}
