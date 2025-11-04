/**
 * Aggressive Cleanup Job (Runs Daily)
 *
 * Removes dead/inactive tokens to improve database performance:
 * - Graduated tokens older than 7 days
 * - Tokens with zero volume in last 3 days
 * - Tokens inactive for 7+ days (no trades)
 * - Low-value tokens (< $100 mcap, < 5 watchers, 2+ days old)
 * - NEW tokens older than 24 hours
 * - BONDED tokens older than 12 hours
 */

import { loggers } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { IScheduledJob, WorkerDependencies } from '../types.js';
import { isValidSolanaMintAddress } from '../utils/mintValidation.js';

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
      logger.info({ operation: this.getName() }, 'Starting aggressive tokens cleanup');

      // Count tokens before cleanup
      const totalBefore = await this.deps.prisma.tokenDiscovery.count();

      // 1. Cleanup GRADUATED tokens older than 7 days
      const graduatedCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const graduatedResult = await this.deps.prisma.tokenDiscovery.deleteMany({
        where: {
          state: 'graduated',
          stateChangedAt: { lt: graduatedCutoff },
        },
      });

      // 2. Cleanup tokens with ZERO volume in last 3 days
      const zeroVolumeCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const zeroVolumeResult = await this.deps.prisma.tokenDiscovery.deleteMany({
        where: {
          OR: [
            { volume24h: { lte: 0 } },
            { volume24h: null },
          ],
          lastTradeTs: { lt: zeroVolumeCutoff },
        },
      });

      // 3. Cleanup tokens inactive for 7+ days (no trades)
      const inactiveCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const inactiveResult = await this.deps.prisma.tokenDiscovery.deleteMany({
        where: {
          lastTradeTs: { lt: inactiveCutoff },
        },
      });

      // 4. Cleanup low-value tokens (< $100 mcap, < 5 watchers, 2+ days old)
      const lowValueCutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const lowValueResult = await this.deps.prisma.tokenDiscovery.deleteMany({
        where: {
          marketCapUsd: { lt: 100 },
          watcherCount: { lt: 5 },
          firstSeenAt: { lt: lowValueCutoff },
        },
      });

      // 5. Cleanup NEW tokens older than 24 hours (aggressive)
      const newCutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newResult = await this.deps.prisma.tokenDiscovery.deleteMany({
        where: {
          state: 'new',
          firstSeenAt: { lt: newCutoffDate },
        },
      });

      // 6. Cleanup BONDED tokens older than 12 hours (aggressive)
      const bondedCutoffDate = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const bondedResult = await this.deps.prisma.tokenDiscovery.deleteMany({
        where: {
          state: 'bonded',
          stateChangedAt: { lt: bondedCutoffDate },
        },
      });

      // 7. Cleanup tokens with invalid mint addresses (addresses ending with "pump", etc.)
      // Fetch all tokens to validate their mint addresses (can't use regex in Prisma WHERE)
      const allTokens = await this.deps.prisma.tokenDiscovery.findMany({
        select: { id: true, mint: true }
      });
      
      const invalidTokenIds = allTokens
        .filter(token => !isValidSolanaMintAddress(token.mint))
        .map(token => token.id);

      const invalidMintResult = invalidTokenIds.length > 0 
        ? await this.deps.prisma.tokenDiscovery.deleteMany({
            where: { id: { in: invalidTokenIds } }
          })
        : { count: 0 };

      if (invalidMintResult.count > 0) {
        logger.warn({
          invalidTokensRemoved: invalidMintResult.count,
          operation: this.getName()
        }, 'Removed tokens with invalid mint addresses');
      }

      // Calculate total removed
      const totalAfter = await this.deps.prisma.tokenDiscovery.count();
      const totalRemoved = totalBefore - totalAfter;

      logger.info({
        totalBefore,
        totalAfter,
        totalRemoved,
        graduatedDeleted: graduatedResult.count,
        zeroVolumeDeleted: zeroVolumeResult.count,
        inactiveDeleted: inactiveResult.count,
        lowValueDeleted: lowValueResult.count,
        newTokensDeleted: newResult.count,
        bondedTokensDeleted: bondedResult.count,
        invalidMintDeleted: invalidMintResult.count,
        operation: this.getName()
      }, 'Aggressive cleanup completed');
    } catch (error) {
      logger.error({ error, operation: this.getName() }, 'Error in job');
    }
  }
}
