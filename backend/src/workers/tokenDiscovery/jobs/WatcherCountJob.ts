/**
 * Watcher Count Job
 *
 * Sync watcher counts from TokenWatch table
 * Uses batch updates to eliminate individual UPDATE queries
 * Extracted from tokenDiscoveryWorker.ts (lines 1490-1533)
 */

import { loggers } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { batchUpdateWatcherCounts } from '../utils/batchUpdate.js';
import { IScheduledJob, WorkerDependencies, BatchUpdateItem } from '../types.js';

const logger = loggers.server;

export class WatcherCountJob implements IScheduledJob {
  constructor(private deps: WorkerDependencies) {}

  getName(): string {
    return 'watcher_counts_sync';
  }

  getInterval(): number {
    return config.intervals.WATCHER_SYNC;
  }

  async run(): Promise<void> {
    try {
      logger.debug({ operation: this.getName() }, 'Starting watcher counts sync');

      const counts = await this.deps.prisma.tokenWatch.groupBy({
        by: ['mint'],
        _count: {
          mint: true,
        },
      });

      if (counts.length === 0) {
        logger.debug({ operation: this.getName() }, 'No watched tokens to sync');
        return;
      }

      // Prepare batch updates
      const watcherUpdates: BatchUpdateItem<number>[] = counts.map(({ mint, _count }) => ({
        mint,
        value: _count.mint
      }));

      // Batch update ALL watcher counts in single operation
      const updated = await batchUpdateWatcherCounts(this.deps.prisma, watcherUpdates);

      logger.info({
        updated,
        operation: this.getName()
      }, 'Watcher counts batch update completed');
    } catch (error) {
      logger.error({ error, operation: this.getName() }, 'Error in job');
    }
  }
}
