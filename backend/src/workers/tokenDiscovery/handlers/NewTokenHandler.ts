/**
 * New Token Handler
 *
 * Handles newToken events from PumpPortal stream
 * Creates BONDED tokens in the discovery system
 * Extracted from tokenDiscoveryWorker.ts (lines 641-866)
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { loggers, truncateWallet, logTokenEvent } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { isLikelyImageUrl, convertIPFStoHTTP, getLogoURI } from '../utils/imageUtils.js';
import { healthCapsuleService } from '../../../services/healthCapsuleService.js';
import { tokenMetadataService, TokenMetadata } from '../../../services/tokenMetadataService.js';
import { holderCountService } from '../../../services/holderCountService.js';
import priceServiceClient from '../../../plugins/priceServiceClient.js';
import {
  IEventHandler,
  NewTokenEventData,
  WorkerDependencies,
  ITxCountManager
} from '../types.js';

const logger = loggers.server;

interface TokenMetrics {
  bondingCurveProgress: Decimal | null;
  tokenState: 'bonded' | 'graduating' | 'new';
  liquidityUsd: Decimal | null;
  marketCapUsd: Decimal | null;
}

export class NewTokenHandler implements IEventHandler<NewTokenEventData> {
  constructor(
    private deps: WorkerDependencies,
    private txCountManager: ITxCountManager
  ) {}

  async handle(event: NewTokenEventData): Promise<void> {
    const mint = event.token?.mint;

    // DEBUG: Log EVERY newToken event received
    console.log('[TokenDiscovery] 🎯 handleNewToken called for:', mint, event.token?.name || event.token?.symbol);

    try {
      // 1. Validate token has required data
      if (!this.validateToken(event)) {
        return;
      }

      const {
        name,
        symbol,
        uri,
        creator,
        bondingCurve,
        marketCapSol,
        vTokensInBondingCurve,
        vSolInBondingCurve,
        holderCount,
        twitter,
        telegram,
        website,
        description
      } = event.token;

      logTokenEvent(logger, 'bonded', truncateWallet(mint!), symbol || truncateWallet(mint!));

      // 2. Calculate metrics (bonding curve, market cap, liquidity)
      const metrics = await this.calculateMetrics(
        mint!,
        marketCapSol,
        vTokensInBondingCurve,
        vSolInBondingCurve
      );

      // 3. Fetch additional metadata if needed
      const metadata = await this.fetchMetadata(mint!, uri, name, symbol, description, twitter, telegram, website);

      // 4. Fetch token supply and decimals
      const supply = await this.fetchSupply(mint!);

      // 5. Get transaction count
      const txCount = this.txCountManager.getCount(mint!);

      // 6. Upsert to database
      await this.upsertToken(
        event.token,
        metrics,
        metadata,
        supply,
        txCount
      );

      // 7. Cache and enrich
      await this.cacheAndEnrich(mint!);
    } catch (error) {
      logger.error({
        mint: mint ? truncateWallet(mint) : 'unknown',
        error,
        event
      }, 'Error handling newToken event');
    }
  }

  /**
   * Validate token has minimum required metadata
   */
  private validateToken(event: NewTokenEventData): boolean {
    const { mint, name, symbol, uri } = event.token;

    if (!mint) {
      logger.error({ event }, 'newToken event missing mint address');
      return false;
    }

    // CRITICAL: Reject tokens with NO metadata (likely fake/spam)
    if (!symbol && !name && !uri) {
      logger.warn({
        mint: truncateWallet(mint),
        hasBondingCurve: !!event.token.bondingCurve,
        hasMarketCap: !!event.token.marketCapSol,
      }, 'Rejecting token with NO metadata (likely fake/spam)');
      return false;
    }

    return true;
  }

  /**
   * Calculate bonding curve progress, state, liquidity, and market cap
   */
  private async calculateMetrics(
    mint: string,
    marketCapSol?: number,
    vTokensInBondingCurve?: number,
    vSolInBondingCurve?: number
  ): Promise<TokenMetrics> {
    let bondingCurveProgress: Decimal | null = null;
    let tokenState: 'bonded' | 'graduating' | 'new' = 'new';
    let liquidityUsd: Decimal | null = null;
    let marketCapUsd: Decimal | null = null;

    // Convert marketCapSol to USD
    if (marketCapSol) {
      try {
        const solPrice = priceServiceClient.getSolPrice();
        if (solPrice > 0) {
          marketCapUsd = new Decimal(marketCapSol).mul(solPrice);
          logger.debug({
            marketCapSol,
            marketCapUsd: marketCapUsd.toFixed(2)
          }, 'Market cap calculated');
        } else {
          logger.warn({ mint: truncateWallet(mint), solPrice }, 'Invalid SOL price, skipping market cap calculation');
        }
      } catch (err) {
        logger.error({ mint: truncateWallet(mint), error: err }, 'Error getting SOL price for market cap');
      }
    }

    // Calculate bonding curve progress
    if (vTokensInBondingCurve && vSolInBondingCurve) {
      // Progress = (SOL in curve / 85 SOL target) * 100
      bondingCurveProgress = new Decimal(vSolInBondingCurve).div(config.scoring.BONDING_CURVE_TARGET_SOL).mul(100);
      const progress = parseFloat(bondingCurveProgress.toString());

      // Classify state based on progress
      if (progress < config.stateThresholds.NEW_TOKEN_MAX_PROGRESS) {
        tokenState = 'new';
      } else if (
        progress >= config.stateThresholds.GRADUATING_MIN_PROGRESS &&
        progress < config.stateThresholds.GRADUATING_MAX_PROGRESS
      ) {
        tokenState = 'graduating';
      } else {
        tokenState = 'bonded';
      }

      // Calculate initial liquidity from bonding curve SOL
      try {
        const liquidityCalc = await healthCapsuleService.calculateBondingCurveLiquidity(vSolInBondingCurve);
        liquidityUsd = new Decimal(liquidityCalc);
      } catch (error) {
        logger.error({ mint: truncateWallet(mint), error }, 'Error calculating bonding curve liquidity');
      }
    }

    return { bondingCurveProgress, tokenState, liquidityUsd, marketCapUsd };
  }

  /**
   * Fetch additional metadata from IPFS if needed
   */
  private async fetchMetadata(
    mint: string,
    uri?: string,
    name?: string,
    symbol?: string,
    description?: string,
    twitter?: string,
    telegram?: string,
    website?: string
  ): Promise<TokenMetadata> {
    let metadata: TokenMetadata = {};

    // Check if we need to fetch metadata
    const httpLogoURI = uri && isLikelyImageUrl(uri) ? convertIPFStoHTTP(uri) : undefined;
    const needsMetadata = uri && (!name || !symbol || !description || !twitter || !telegram || !website || !httpLogoURI);

    if (needsMetadata) {
      try {
        metadata = await tokenMetadataService.fetchMetadataFromIPFS(uri!);

        // Log metadata overrides
        if (!name && metadata.name) {
          console.log(`✅ [TokenDiscovery] Got name from IPFS for ${truncateWallet(mint)}: ${metadata.name}`);
        }
        if (!symbol && metadata.symbol) {
          console.log(`✅ [TokenDiscovery] Got symbol from IPFS for ${truncateWallet(mint)}: ${metadata.symbol}`);
        }
      } catch (err) {
        logger.warn({
          mint: truncateWallet(mint),
          uri,
          error: err
        }, 'Failed to fetch metadata from IPFS');
      }
    }

    return metadata;
  }

  /**
   * Fetch token supply and decimals from Helius
   */
  private async fetchSupply(mint: string): Promise<{ totalSupply?: string; decimals?: number }> {
    try {
      const supplyData = await holderCountService.getTokenSupply(mint);
      if (supplyData) {
        return {
          totalSupply: supplyData.totalSupply,
          decimals: supplyData.decimals
        };
      }
    } catch (err) {
      logger.warn({
        mint: truncateWallet(mint),
        error: err
      }, 'Failed to fetch token supply on new token');
    }

    return {};
  }

  /**
   * Upsert token to database
   */
  private async upsertToken(
    token: any,
    metrics: TokenMetrics,
    metadata: TokenMetadata,
    supply: { totalSupply?: string; decimals?: number },
    txCount: number
  ): Promise<void> {
    const {
      mint,
      name,
      symbol,
      uri,
      creator,
      bondingCurve,
      holderCount,
      twitter,
      telegram,
      website,
      description
    } = token;

    const httpLogoURI = uri && isLikelyImageUrl(uri) ? convertIPFStoHTTP(uri) : undefined;

    try {
      await this.deps.prisma.tokenDiscovery.upsert({
        where: { mint },
        create: {
          mint,
          symbol: symbol || metadata.symbol || null,
          name: name || metadata.name || null,
          logoURI: getLogoURI(metadata.imageUrl, uri),
          imageUrl: metadata.imageUrl ? convertIPFStoHTTP(metadata.imageUrl) : null,
          description: description || metadata.description || null,
          twitter: twitter || metadata.twitter || null,
          telegram: telegram || metadata.telegram || null,
          website: website || metadata.website || null,
          creatorWallet: creator || null,
          holderCount: holderCount || null,
          decimals: supply.decimals || null,
          totalSupply: supply.totalSupply || null,
          txCount24h: txCount > 0 ? txCount : null,
          state: metrics.tokenState,
          bondingCurveKey: bondingCurve || null,
          bondingCurveProgress: metrics.bondingCurveProgress,
          liquidityUsd: metrics.liquidityUsd,
          marketCapUsd: metrics.marketCapUsd,
          hotScore: new Decimal(config.scoring.INITIAL_HOT_SCORE),
          watcherCount: 0,
          freezeRevoked: false,
          mintRenounced: false,
          creatorVerified: false,
          firstSeenAt: new Date(),
          lastUpdatedAt: new Date(),
          stateChangedAt: new Date(),
        },
        update: {
          lastUpdatedAt: new Date(),
          ...(description && { description }),
          ...(twitter && { twitter }),
          ...(telegram && { telegram }),
          ...(website && { website }),
          ...(metadata.imageUrl && { imageUrl: convertIPFStoHTTP(metadata.imageUrl) }),
          ...(metadata.imageUrl ? { logoURI: convertIPFStoHTTP(metadata.imageUrl) } : {}),
          ...(holderCount && { holderCount }),
          ...(supply.decimals && { decimals: supply.decimals }),
          ...(supply.totalSupply && { totalSupply: supply.totalSupply }),
          ...(txCount > 0 && { txCount24h: txCount }),
          ...(metrics.bondingCurveProgress && {
            bondingCurveProgress: metrics.bondingCurveProgress,
            ...(metrics.bondingCurveProgress.gte(95) && { state: 'graduating' }),
          }),
          ...(metrics.liquidityUsd && { liquidityUsd: metrics.liquidityUsd }),
          ...(metrics.marketCapUsd && { marketCapUsd: metrics.marketCapUsd }),
        },
      });
    } catch (err) {
      logger.error({
        mint: truncateWallet(mint),
        error: err
      }, 'Database upsert failed for newToken event');
      throw err;
    }
  }

  /**
   * Cache token and trigger async health enrichment
   */
  private async cacheAndEnrich(mint: string): Promise<void> {
    // Cache in Redis
    try {
      await this.deps.cacheManager.cacheTokenRow(mint);
    } catch (err) {
      logger.error({
        mint: truncateWallet(mint),
        error: err
      }, 'Redis cache failed for newToken event');
    }

    // Async health enrichment (non-blocking)
    this.deps.healthEnricher.enrichHealthData(mint).catch((err) =>
      logger.error({
        mint: truncateWallet(mint),
        error: err
      }, 'Health enrichment error')
    );
  }
}
