/**
 * Hot Score Job
 *
 * Recalculate hot scores for all active tokens
 * Uses batch updates to eliminate individual UPDATE queries
 * Extracted from tokenDiscoveryWorker.ts (lines 1284-1378)
 */

import { loggers, truncateWallet } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { batchUpdateHotScores } from '../utils/batchUpdate.js';
import { IScheduledJob, WorkerDependencies, BatchUpdateItem } from '../types.js';

const logger = loggers.server;

export class HotScoreJob implements IScheduledJob {
  constructor(private deps: WorkerDependencies) {}

  getName(): string {
    return 'hot_scores_calculation';
  }

  getInterval(): number {
    return config.intervals.HOT_SCORE_UPDATE;
  }

  async run(): Promise<void> {
    try {
      if (logger.isLevelEnabled('debug')) {
        logger.debug({ operation: this.getName() }, 'Starting hot scores recalculation');
      }

      const tokens = await this.deps.prisma.tokenDiscovery.findMany({
        where: {
          state: { in: ['bonded', 'graduating', 'new'] },
        },
        select: {
          mint: true,
          state: true,
          bondingCurveProgress: true,
          poolAddress: true,
          firstSeenAt: true,
          liquidityUsd: true,
          watcherCount: true,
          hotScore: true,
        }
      });

      if (tokens.length === 0) {
        logger.debug({ operation: this.getName() }, 'No tokens to update');
        return;
      }

      // Calculate all hot scores first
      const scoreUpdates: BatchUpdateItem<number>[] = [];

      for (const token of tokens) {
        try {
          const newScore = await this.deps.healthEnricher.calculateHotScore(token.mint);
          const currentScore = parseFloat(token.hotScore.toString());

          // Only update if score changed
          if (newScore !== currentScore) {
            scoreUpdates.push({ mint: token.mint, value: newScore });
          }

          // Handle state transitions inline (these are rare)
          const progress = token.bondingCurveProgress ? parseFloat(token.bondingCurveProgress.toString()) : 0;
          if (token.state === 'new' &&
              progress >= config.stateThresholds.GRADUATING_MIN_PROGRESS &&
              progress < config.stateThresholds.GRADUATING_MAX_PROGRESS) {
            await this.deps.stateManager.updateState(token.mint, 'graduating', token.state);
          } else if (token.state === 'graduating' &&
                     (progress >= config.stateThresholds.GRADUATING_MAX_PROGRESS || token.poolAddress)) {
            await this.deps.stateManager.updateState(token.mint, 'bonded', token.state);
          } else if (token.state === 'new' &&
                     (progress >= config.stateThresholds.GRADUATING_MAX_PROGRESS || token.poolAddress)) {
            await this.deps.stateManager.updateState(token.mint, 'bonded', token.state);
          }
        } catch (error: any) {
          logger.error({ mint: truncateWallet(token.mint), error: error.message }, 'Error calculating hot score');
        }
      }

      // Batch update ALL scores in single operation
      const result = await batchUpdateHotScores(this.deps.prisma, scoreUpdates);

      if (result.updated > 0) {
        logger.info({
          updated: result.updated,
          skipped: tokens.length - result.updated,
          operation: this.getName()
        }, 'Hot scores batch update completed');
      } else {
        logger.debug({
          total: tokens.length,
          operation: this.getName()
        }, 'No hot score changes needed');
      }
    } catch (error) {
      logger.error({ error, operation: this.getName() }, 'Error in job');
    }
  }
}
