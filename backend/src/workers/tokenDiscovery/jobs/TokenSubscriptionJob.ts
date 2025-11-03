/**
 * Token Subscription Job
 *
 * Subscribe to trades for active tokens
 * Fetches top tokens by volume/activity and subscribes to their trades
 * Extracted from tokenDiscoveryWorker.ts (lines 1539-1577)
 */

import { loggers } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { IScheduledJob } from '../types.js';
import { PrismaClient } from '@prisma/client';

const logger = loggers.server;

export class TokenSubscriptionJob implements IScheduledJob {
  constructor(
    private prisma: PrismaClient,
    private pumpPortalStream: any // PumpPortalStreamService
  ) {}

  getName(): string {
    return 'trade_subscription';
  }

  getInterval(): number {
    return config.intervals.TOKEN_SUBSCRIPTION;
  }

  async run(): Promise<void> {
    try {
      // Fetch top tokens by volume, market cap, or recent activity
      const activeTokens = await this.prisma.tokenDiscovery.findMany({
        where: {
          OR: [
            { volume24h: { gt: 1000 } }, // Tokens with >$1000 volume
            { marketCapUsd: { gt: 5000 } }, // Tokens with >$5000 market cap
            { lastTradeTs: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Traded in last 24h
            { state: 'graduating' }, // All graduating tokens
          ],
        },
        select: {
          mint: true,
        },
        orderBy: [
          { volume24h: 'desc' },
          { marketCapUsd: 'desc' },
        ],
        take: config.limits.MAX_ACTIVE_TOKENS_SUBSCRIPTION,
      });

      const tokenMints = activeTokens.map(t => t.mint);

      if (tokenMints.length === 0) {
        logger.debug({ operation: this.getName() }, 'No active tokens found to subscribe to');
        return;
      }

      logger.debug({
        count: tokenMints.length,
        operation: this.getName()
      }, 'Subscribing to trades for active tokens');

      this.pumpPortalStream.subscribeToTokens(tokenMints);

      logger.debug({
        totalSubscribed: this.pumpPortalStream.getSubscribedTokenCount(),
        operation: this.getName()
      }, 'Trade subscription status');
    } catch (error) {
      logger.error({ error, operation: this.getName() }, 'Error in job');
    }
  }
}
