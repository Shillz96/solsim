/**
 * Batch Update Utilities
 *
 * Provides safe batch update operations to fix SQL injection vulnerabilities
 * Replaces $executeRawUnsafe with Prisma transactions
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { loggers } from '../../../utils/logger.js';

const logger = loggers.server;

export interface BatchUpdateItem<T = number> {
  mint: string;
  value: T;
}

/**
 * Safely batch update a numeric field in TokenDiscovery table
 * Uses Prisma transactions instead of raw SQL to prevent SQL injection
 *
 * @param prisma - PrismaClient instance
 * @param fieldName - Field name to update (e.g., 'hotScore', 'holderCount')
 * @param updates - Array of {mint, value} pairs
 * @param operation - Operation name for logging
 * @returns Number of successful updates
 */
export async function batchUpdateNumericField(
  prisma: PrismaClient,
  fieldName: string,
  updates: BatchUpdateItem<number>[],
  operation: string
): Promise<number> {
  if (updates.length === 0) {
    return 0;
  }

  let successCount = 0;

  try {
    // Use transaction with individual updateMany calls
    // This is safer than raw SQL and still reasonably performant
    await prisma.$transaction(
      updates.map(({ mint, value }) =>
        prisma.tokenDiscovery.updateMany({
          where: { mint },
          data: { [fieldName]: value },
        })
      )
    );

    successCount = updates.length;

    logger.info({
      updated: successCount,
      operation,
    }, `Batch update completed: ${fieldName}`);
  } catch (error) {
    logger.error({ error, operation, fieldName }, 'Error in batch update');
    throw error;
  }

  return successCount;
}

/**
 * Batch update hot scores
 * Specialized function for hot score updates with logging
 */
export async function batchUpdateHotScores(
  prisma: PrismaClient,
  updates: BatchUpdateItem<number>[]
): Promise<{ updated: number; skipped: number }> {
  if (updates.length === 0) {
    return { updated: 0, skipped: 0 };
  }

  try {
    const updated = await batchUpdateNumericField(
      prisma,
      'hotScore',
      updates,
      'hot_scores_update'
    );

    return {
      updated,
      skipped: 0,
    };
  } catch (error) {
    logger.error({ error }, 'Error updating hot scores');
    return { updated: 0, skipped: updates.length };
  }
}

/**
 * Batch update holder counts
 * Specialized function for holder count updates with logging
 */
export async function batchUpdateHolderCounts(
  prisma: PrismaClient,
  updates: BatchUpdateItem<number>[]
): Promise<{ updated: number; failed: number }> {
  if (updates.length === 0) {
    return { updated: 0, failed: 0 };
  }

  try {
    const updated = await batchUpdateNumericField(
      prisma,
      'holderCount',
      updates,
      'holder_counts_update'
    );

    return {
      updated,
      failed: 0,
    };
  } catch (error) {
    logger.error({ error }, 'Error updating holder counts');
    return { updated: 0, failed: updates.length };
  }
}

/**
 * Batch update watcher counts
 * Specialized function for watcher count updates with logging
 */
export async function batchUpdateWatcherCounts(
  prisma: PrismaClient,
  updates: BatchUpdateItem<number>[]
): Promise<number> {
  if (updates.length === 0) {
    return 0;
  }

  try {
    const updated = await batchUpdateNumericField(
      prisma,
      'watcherCount',
      updates,
      'watcher_counts_update'
    );

    return updated;
  } catch (error) {
    logger.error({ error }, 'Error updating watcher counts');
    return 0;
  }
}
