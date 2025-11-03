/**
 * Token Cache Manager Service
 *
 * Manages token caching operations in Redis
 * Extracted from tokenDiscoveryWorker.ts (lines 336-390)
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { loggers, truncateWallet } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { ITokenCacheManager } from '../types.js';

const logger = loggers.server;

export class TokenCacheManager implements ITokenCacheManager {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  /**
   * Cache token row in Redis with TTL
   */
  async cacheTokenRow(mint: string): Promise<void> {
    try {
      const token = await this.prisma.tokenDiscovery.findUnique({ where: { mint } });
      if (!token) return;

      const tokenRow = {
        mint: token.mint,
        symbol: token.symbol,
        name: token.name,
        logoURI: token.logoURI,
        state: token.state,
        liqUsd: token.liquidityUsd ? parseFloat(token.liquidityUsd.toString()) : undefined,
        priceImpactPctAt1pct: token.priceImpact1Pct
          ? parseFloat(token.priceImpact1Pct.toString())
          : undefined,
        freezeRevoked: token.freezeRevoked,
        mintRenounced: token.mintRenounced,
        hotScore: parseFloat(token.hotScore.toString()),
        watcherCount: token.watcherCount,
        firstSeenAt: token.firstSeenAt.toISOString(),
        poolAgeMin: token.poolCreatedAt
          ? Math.floor((Date.now() - token.poolCreatedAt.getTime()) / 60000)
          : undefined,
      };

      // Cache individual token with TTL
      await this.redis.setex(`token:${mint}`, config.cache.TOKEN_TTL, JSON.stringify(tokenRow));

      // Add to sorted set by hotScore for fast feed queries
      await this.redis.zadd(
        `tokens:${token.state}`,
        parseFloat(token.hotScore.toString()),
        mint
      );
    } catch (error) {
      logger.error({ mint: truncateWallet(mint), error }, 'Error caching token');
    }
  }

  /**
   * Invalidate token cache
   */
  async invalidateCache(mint: string): Promise<void> {
    await this.redis.del(`token:${mint}`);
  }
}
