/**
 * Token State Manager Service
 *
 * Manages token state transitions and notifications
 * Extracted from tokenDiscoveryWorker.ts (lines 190-331)
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import Redis from 'ioredis';
import { loggers, truncateWallet } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { ITokenStateManager, TokenClassificationInput } from '../types.js';

const logger = loggers.server;

export class TokenStateManager implements ITokenStateManager {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  /**
   * Update token state with transition tracking
   */
  async updateState(mint: string, newState: string, oldState?: string): Promise<void> {
    await this.prisma.tokenDiscovery.update({
      where: { mint },
      data: {
        state: newState,
        previousState: oldState || null,
        stateChangedAt: new Date(),
        lastUpdatedAt: new Date(),
      },
    });

    // Invalidate Redis cache
    await this.redis.del(`token:${mint}`);

    logger.debug({
      mint: truncateWallet(mint),
      oldState,
      newState,
    }, 'Token state transition');
  }

  /**
   * Classify token into lifecycle state based on trading activity and bonding progress
   */
  classifyTokenState(token: TokenClassificationInput): string {
    const now = Date.now();
    const progress = token.bondingCurveProgress ? parseFloat(token.bondingCurveProgress.toString()) : 0;

    // Early return: Graduated tokens
    if (progress >= config.stateThresholds.GRADUATING_MAX_PROGRESS || token.isGraduated) {
      return 'BONDED';
    }

    // Early return: No trades yet
    if (!token.hasFirstTrade || !token.lastTradeTs) {
      return 'LAUNCHING';
    }

    // Calculate metrics once
    const timeSinceLastTrade = now - token.lastTradeTs.getTime();
    const volume24h = token.volume24hSol ? parseFloat(token.volume24hSol.toString()) : 0;
    const holders = token.holderCount || 0;

    // Early return: About to bond (high progress + recent activity)
    const aboutToBondWindow = config.stateThresholds.ABOUT_TO_BOND_MINUTES * 60 * 1000;
    if (progress >= config.stateThresholds.ABOUT_TO_BOND_PROGRESS && timeSinceLastTrade < aboutToBondWindow) {
      return 'ABOUT_TO_BOND';
    }

    // Early return: Dead tokens (old OR low volume)
    const deadTokenWindow = config.stateThresholds.DEAD_TOKEN_HOURS * 60 * 60 * 1000;
    if (timeSinceLastTrade > deadTokenWindow || volume24h < config.stateThresholds.MIN_DEAD_VOLUME_SOL) {
      return 'DEAD';
    }

    // Check if active: recent trades + sufficient volume + holders
    const activeTokenWindow = config.stateThresholds.ACTIVE_TOKEN_HOURS * 60 * 60 * 1000;
    const hasRecentActivity = timeSinceLastTrade < activeTokenWindow;
    const hasMinVolume = volume24h >= config.limits.MIN_ACTIVE_VOLUME_SOL;
    const hasMinHolders = holders >= config.limits.MIN_HOLDERS_COUNT;

    // Return ACTIVE if all conditions met, otherwise LAUNCHING
    return (hasRecentActivity && hasMinVolume && hasMinHolders) ? 'ACTIVE' : 'LAUNCHING';
  }

  /**
   * Notify watchers on state change
   */
  async notifyWatchers(mint: string, oldState: string, newState: string): Promise<void> {
    try {
      // Query watchers based on preferences
      const watchers = await this.prisma.tokenWatch.findMany({
        where: {
          mint,
          OR: [
            // Notify on graduation (bonded → graduating)
            {
              notifyOnGraduation: true,
              currentState: 'bonded',
            },
            // Notify on migration (graduating → new OR bonded → new)
            {
              notifyOnMigration: true,
            },
          ],
        },
        include: {
          user: true,
        },
      });

      if (watchers.length === 0) {
        return;
      }

      logger.debug({
        watcherCount: watchers.length,
        mint: truncateWallet(mint),
        oldState,
        newState,
      }, 'Notifying watchers of token state change');

      // TODO: Integrate with NotificationService
      // For now, just log
      for (const watch of watchers) {
        logger.debug({
          userId: watch.userId,
          mint: truncateWallet(mint),
          transition: `${oldState} → ${newState}`,
        }, 'User notified of token transition');

        // Example notification payload:
        // await notificationService.create({
        //   userId: watch.userId,
        //   type: 'WALLET_TRACKER_TRADE',
        //   category: 'GENERAL',
        //   title: `${oldState} → ${newState}`,
        //   message: `Your watched token ${mint} has transitioned to ${newState}`,
        //   actionUrl: `/room/${mint}`,
        // });
      }
    } catch (error) {
      logger.error({ mint: truncateWallet(mint), error }, 'Error notifying watchers');
    }
  }
}
