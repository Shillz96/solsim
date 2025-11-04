/**
 * New Pool Event Handler
 *
 * Handles newPool events from Raydium stream
 * Creates or updates tokens when they get Raydium liquidity pools
 * Extracted from tokenDiscoveryWorker.ts (lines 928-995)
 */

import { Decimal } from '@prisma/client/runtime/library';
import { loggers, truncateWallet } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { validateMintWithLogging } from '../utils/mintValidation.js';
import { IEventHandler, NewPoolEventData, WorkerDependencies } from '../types.js';

const logger = loggers.server;

export class NewPoolHandler implements IEventHandler<NewPoolEventData> {
  constructor(private deps: WorkerDependencies) {}

  async handle(event: NewPoolEventData): Promise<void> {
    try {
      const { poolAddress, mint1, mint2, signature, blockTime } = event.pool;

      // Determine which mint is the token (not SOL/USDC/USDT)
      const knownMints = Object.values(config.knownMints);
      const tokenMint = knownMints.includes(mint1) ? mint2 : mint1;

      logger.info({
        tokenMint: truncateWallet(tokenMint),
        poolType: 'raydium'
      }, 'New Raydium pool discovered');

      // Check if token already exists (migration path)
      const existing = await this.deps.prisma.tokenDiscovery.findUnique({
        where: { mint: tokenMint },
      });

      if (existing) {
        // Update existing token to BONDED state (has LP now)
        logger.info({
          tokenMint: truncateWallet(tokenMint),
          previousStatus: 'GRADUATING',
          newStatus: 'BONDED'
        }, 'Token graduated to bonded state');

        await this.deps.stateManager.updateState(tokenMint, 'bonded', existing.state);

        // Buffer pool data update (batch sync to DB later)
        await this.deps.bufferManager.bufferToken({
          mint: tokenMint,
          poolAddress,
          poolType: 'raydium',
          poolCreatedAt: new Date(blockTime * 1000),
        });

        // Notify watchers
        await this.deps.stateManager.notifyWatchers(tokenMint, existing.state, 'bonded');
      } else {
        // Direct Raydium listing (not from Pump.fun) - has LP, so BONDED
        logger.info({
          tokenMint: truncateWallet(tokenMint),
          listingType: 'direct_raydium'
        }, 'Creating direct Raydium listing');

        // Validate mint address format before saving
        if (!validateMintWithLogging(tokenMint, logger, { listingType: 'direct_raydium' })) {
          return;
        }

        // Write new token to DB immediately (needed for queries)
        await this.deps.prisma.tokenDiscovery.create({
          data: {
            mint: tokenMint,
            state: 'bonded',
            poolAddress,
            poolType: 'raydium',
            poolCreatedAt: new Date(blockTime * 1000),
            hotScore: new Decimal(config.scoring.DIRECT_LISTING_HOT_SCORE),
            watcherCount: 0,
            freezeRevoked: false,
            mintRenounced: false,
            firstSeenAt: new Date(),
            lastUpdatedAt: new Date(),
            stateChangedAt: new Date(),
          },
        });
      }

      // Cache in Redis
      await this.deps.cacheManager.cacheTokenRow(tokenMint);

      // Async health enrichment
      this.deps.healthEnricher.enrichHealthData(tokenMint).catch((err) =>
        logger.error({
          mint: truncateWallet(tokenMint),
          error: err
        }, 'Health enrichment error')
      );
    } catch (error) {
      logger.error({ error }, 'Error handling newPool event');
    }
  }
}
