/**
 * Token Health Enricher Service
 *
 * Handles token health enrichment and scoring
 * Extracted from tokenDiscoveryWorker.ts (lines 395-512)
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { loggers, truncateWallet } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { healthCapsuleService } from '../../../services/healthCapsuleService.js';
import { tokenMetadataService } from '../../../services/tokenMetadataService.js';
import { solanaTokenMetadataService } from '../../../services/solanaTokenMetadataService.js';
import { holderCountService } from '../../../services/holderCountService.js';
import { ITokenHealthEnricher, ITokenCacheManager } from '../types.js';

const logger = loggers.server;

export class TokenHealthEnricher implements ITokenHealthEnricher {
  constructor(
    private prisma: PrismaClient,
    private cacheManager: ITokenCacheManager
  ) {}

  /**
   * Enrich token with health capsule data + metadata + market data (async, batched)
   */
  async enrichHealthData(mint: string): Promise<void> {
    try {
      // Get current token to fetch metadata URI
      const currentToken = await this.prisma.tokenDiscovery.findUnique({
        where: { mint },
        select: { logoURI: true, name: true, symbol: true, imageUrl: true },
      });

      // Fetch all data in parallel
      const [healthData, enrichedData, solanaMetadata] = await Promise.allSettled([
        healthCapsuleService.getHealthData(mint),
        tokenMetadataService.getEnrichedMetadata(mint, currentToken?.logoURI || undefined),
        solanaTokenMetadataService.getCompleteTokenMetadata(mint)
      ]);

      const updateData: any = {
        lastUpdatedAt: new Date(),
      };

      // Add health data if successful
      if (healthData.status === 'fulfilled') {
        updateData.freezeRevoked = healthData.value.freezeRevoked;
        updateData.mintRenounced = healthData.value.mintRenounced;
        if (healthData.value.priceImpact1Pct) {
          updateData.priceImpact1Pct = new Decimal(healthData.value.priceImpact1Pct);
        }
        if (healthData.value.liquidityUsd) {
          updateData.liquidityUsd = new Decimal(healthData.value.liquidityUsd);
        }
      }

      // Add Solana on-chain metadata (priority over other sources)
      if (solanaMetadata.status === 'fulfilled') {
        const data = solanaMetadata.value;
        
        // Only update if we have better data than what's currently stored
        if (data.name && (!currentToken?.name || currentToken.name === mint.slice(0, 8))) {
          updateData.name = data.name;
        }
        if (data.symbol && (!currentToken?.symbol || currentToken.symbol === mint.slice(0, 8))) {
          updateData.symbol = data.symbol;
        }
        if (data.description) {
          updateData.description = data.description;
        }
        if (data.imageUrl && (!currentToken?.imageUrl || !currentToken?.logoURI)) {
          updateData.imageUrl = data.imageUrl;
          updateData.logoURI = data.imageUrl;
        }
        
        logger.debug({ 
          mint: truncateWallet(mint),
          hasName: !!data.name,
          hasSymbol: !!data.symbol,
          hasImage: !!data.imageUrl 
        }, 'Enhanced with Solana on-chain metadata');
      }

      // Add metadata and market data if successful (fallback for missing fields)
      if (enrichedData.status === 'fulfilled') {
        const data = enrichedData.value;

        // Only use enriched data if we don't already have it from Solana metadata
        if (data.description && !updateData.description) updateData.description = data.description;
        if (data.imageUrl && !updateData.imageUrl) {
          updateData.imageUrl = data.imageUrl;
          // Ensure logoURI is populated when we have an imageUrl but no existing logoURI
          if (!currentToken?.logoURI) {
            updateData.logoURI = data.imageUrl;
          }
        }
        if (data.twitter) updateData.twitter = data.twitter;
        if (data.telegram) updateData.telegram = data.telegram;
        if (data.website) updateData.website = data.website;

        // Market data fields
        if (data.marketCapUsd) updateData.marketCapUsd = new Decimal(data.marketCapUsd);
        if (data.volume24h) updateData.volume24h = new Decimal(data.volume24h);
        if (data.volumeChange24h) updateData.volumeChange24h = new Decimal(data.volumeChange24h);
        if (data.priceUsd) updateData.priceUsd = new Decimal(data.priceUsd);
        if (data.priceChange24h) updateData.priceChange24h = new Decimal(data.priceChange24h);
        if (data.txCount24h) updateData.txCount24h = data.txCount24h;
      }

      // Fetch token supply and decimals from Helius
      try {
        const supplyData = await holderCountService.getTokenSupply(mint);
        if (supplyData) {
          updateData.decimals = supplyData.decimals;
          updateData.totalSupply = supplyData.totalSupply;
        }
      } catch (error) {
        logger.error({ mint: truncateWallet(mint), error }, 'Error fetching token supply');
      }

      await this.prisma.tokenDiscovery.update({
        where: { mint },
        data: updateData,
      });

      // Update cache
      await this.cacheManager.cacheTokenRow(mint);

      logger.debug({ mint: truncateWallet(mint) }, 'Health data enriched for token');
    } catch (error) {
      logger.error({ mint: truncateWallet(mint), error }, 'Error enriching health data');
    }
  }

  /**
   * Calculate hot score based on recency, liquidity, and watchers
   */
  async calculateHotScore(mint: string): Promise<number> {
    try {
      const token = await this.prisma.tokenDiscovery.findUnique({ where: { mint } });
      if (!token) return 0;

      const ageMinutes = (Date.now() - token.firstSeenAt.getTime()) / 60000;

      // Recency score: 100 at creation, decay to 0 over 24 hours
      const recencyScore = Math.max(0, 100 - (ageMinutes / 1440) * 100);

      // Liquidity score: $50k = 100 points
      const liqUsd = token.liquidityUsd ? parseFloat(token.liquidityUsd.toString()) : 0;
      const liquidityScore = Math.min((liqUsd / config.scoring.LIQUIDITY_SCORE_TARGET_USD) * 100, 100);

      // Watcher score: each watcher = 10 points, cap at 100
      const watcherScore = Math.min(
        token.watcherCount * config.scoring.WATCHER_SCORE_MULTIPLIER,
        config.scoring.MAX_WATCHER_SCORE
      );

      // Combined formula: 50% recency, 30% liquidity, 20% watchers
      const hotScore =
        recencyScore * config.scoring.RECENCY_WEIGHT +
        liquidityScore * config.scoring.LIQUIDITY_WEIGHT +
        watcherScore * config.scoring.WATCHER_WEIGHT;

      return Math.round(hotScore);
    } catch (error) {
      logger.error({ mint: truncateWallet(mint), error }, 'Error calculating hot score');
      return 0;
    }
  }
}
