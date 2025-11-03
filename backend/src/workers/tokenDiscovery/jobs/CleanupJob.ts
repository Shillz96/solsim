/**
 * Cleanup Job
 *
 * Cleanup old tokens (>48h old for NEW, >24h for BONDED)
 * Extracted from tokenDiscoveryWorker.ts (lines 1582-1612)
 */

import { loggers } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { IScheduledJob, WorkerDependencies } from '../types.js';

const logger = loggers.server;

export class CleanupJob implements IScheduledJob {
  constructor(private deps: WorkerDependencies) {}

  getName(): string {
    return 'cleanup_old_tokens';
  }

  getInterval(): number {
    return config.intervals.CLEANUP;
  }

  async run(): Promise<void> {
    try {
      logger.debug({ operation: this.getName() }, 'Starting old tokens cleanup');

      // Cleanup old NEW tokens (>48h old)
      const newCutoffDate = new Date(
        Date.now() - config.retention.NEW_TOKEN_HOURS * 60 * 60 * 1000
      );
      const newResult = await this.deps.prisma.tokenDiscovery.deleteMany({
        where: {
          state: 'new',
          firstSeenAt: { lt: newCutoffDate },
        },
      });

      // Cleanup BONDED tokens older than 24 hours (based on stateChangedAt)
      const bondedCutoffDate = new Date(
        Date.now() - config.retention.BONDED_TOKEN_HOURS * 60 * 60 * 1000
      );
      const bondedResult = await this.deps.prisma.tokenDiscovery.deleteMany({
        where: {
          state: 'bonded',
          stateChangedAt: { lt: bondedCutoffDate },
        },
      });

      logger.debug({
        newTokensDeleted: newResult.count,
        bondedTokensDeleted: bondedResult.count,
        operation: this.getName()
      }, 'Old tokens cleanup completed');
    } catch (error) {
      logger.error({ error, operation: this.getName() }, 'Error in job');
    }
  }
}
