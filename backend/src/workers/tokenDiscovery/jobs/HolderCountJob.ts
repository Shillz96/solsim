/**
 * Holder Count Job
 *
 * Update holder counts for active tokens using Helius RPC
 * Uses batch updates to eliminate individual UPDATE queries
 * Extracted from tokenDiscoveryWorker.ts (lines 1385-1484)
 */

import { loggers } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { holderCountService } from '../../../services/holderCountService.js';
import { batchUpdateHolderCounts } from '../utils/batchUpdate.js';
import { IScheduledJob, WorkerDependencies, BatchUpdateItem } from '../types.js';

const logger = loggers.server;

export class HolderCountJob implements IScheduledJob {
  constructor(private deps: WorkerDependencies) {}

  getName(): string {
    return 'holder_counts_update';
  }

  getInterval(): number {
    return config.intervals.HOLDER_COUNT_UPDATE;
  }

  async run(): Promise<void> {
    try {
      logger.debug({ operation: this.getName() }, 'Starting holder counts update');

      // Calculate cache cutoff (don't re-fetch if updated within last N minutes)
      const cacheCutoff = new Date(Date.now() - config.cache.HOLDER_COUNT_CACHE_MIN * 60 * 1000);

      // Fetch active tokens (exclude DEAD tokens and recently updated)
      const activeTokens = await this.deps.prisma.tokenDiscovery.findMany({
        where: {
          status: { not: 'DEAD' },
          state: { in: ['bonded', 'graduating', 'new'] },
          OR: [
            { holderCount: null },
            { lastUpdatedAt: { lt: cacheCutoff } }
          ]
        },
        select: {
          mint: true,
          symbol: true,
          holderCount: true,
          lastUpdatedAt: true,
          volume24hSol: true,
        },
        take: config.limits.MAX_HOLDER_COUNT_BATCH,
        orderBy: [
          { holderCount: 'asc' }, // Prioritize null/0 holder counts first
          { volume24hSol: 'desc' }, // Then by trading volume
          { lastUpdatedAt: 'asc' }, // Finally oldest updates
        ],
      });

      if (activeTokens.length === 0) {
        logger.debug({ operation: this.getName() }, 'No active tokens to update holder counts for');
        return;
      }

      logger.debug({
        count: activeTokens.length,
        operation: this.getName()
      }, 'Fetching holder counts for active tokens');

      // Batch fetch holder counts
      const mints = activeTokens.map(t => t.mint);
      const holderCounts = await holderCountService.getHolderCounts(mints);

      // Prepare batch updates (only update if count changed)
      const holderUpdates: BatchUpdateItem<number>[] = [];
      let failed = 0;

      for (const token of activeTokens) {
        const holderCount = holderCounts.get(token.mint);

        if (holderCount !== null && holderCount !== undefined) {
          // Skip unchanged data
          if (holderCount !== token.holderCount) {
            holderUpdates.push({ mint: token.mint, value: holderCount });
          }
        } else {
          failed++;
        }
      }

      // Batch update ALL holder counts in single operation
      const result = await batchUpdateHolderCounts(this.deps.prisma, holderUpdates);

      logger.info({
        updated: result.updated,
        skipped: activeTokens.length - result.updated - failed,
        failed,
        operation: this.getName()
      }, 'Holder counts batch update completed');
    } catch (error) {
      logger.error({ error, operation: this.getName() }, 'Error in job');
    }
  }
}
