/**
 * Market Data Job
 *
 * Update market data and classify token states every 5 minutes
 * Fetches market data from DexScreener with fallback to Redis/Jupiter
 * Extracted from tokenDiscoveryWorker.ts (lines 1097-1278)
 */

import { Decimal } from '@prisma/client/runtime/library';
import { loggers, truncateWallet, logBatchOperation } from '../../../utils/logger.js';
import { config } from '../config/index.js';
import { tokenMetadataService } from '../../../services/tokenMetadataService.js';
import priceServiceClient from '../../../plugins/priceServiceClient.js';
import { IScheduledJob, WorkerDependencies } from '../types.js';

const logger = loggers.server;

export class MarketDataJob implements IScheduledJob {
  constructor(private deps: WorkerDependencies) {}

  getName(): string {
    return 'market_data_update';
  }

  getInterval(): number {
    return config.intervals.MARKET_DATA_UPDATE;
  }

  async run(): Promise<void> {
    try {
      // Align with warpPipes feed config (72 hours) to ensure all visible tokens get fresh data
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

      // Fetch recent tokens (exclude DEAD to save API calls)
      const activeTokens = await this.deps.prisma.tokenDiscovery.findMany({
        where: {
          status: { not: 'DEAD' },
          OR: [
            { state: 'bonded', stateChangedAt: { gte: seventyTwoHoursAgo } },
            { state: 'graduating' },
            { state: 'new', firstSeenAt: { gte: seventyTwoHoursAgo } }
          ]
        },
        select: {
          mint: true,
          bondingCurveProgress: true,
          lastTradeTs: true,
          volume24hSol: true,
          holderCount: true,
          marketCapUsd: true,
          priceUsd: true,
        },
        take: config.limits.MAX_TOKENS_PER_BATCH,
        orderBy: { lastUpdatedAt: 'asc' }
      });

      logBatchOperation(logger, this.getName(), activeTokens.length);

      // Batch update with rate limiting
      let updated = 0;
      for (const token of activeTokens) {
        try {
          // Fetch fresh market data from DexScreener
          const marketData = await tokenMetadataService.fetchMarketData(token.mint);

          logger.debug({
            mint: token.mint.slice(0, 8),
            priceUsd: marketData.priceUsd,
            priceChange24h: marketData.priceChange24h,
            marketCapUsd: marketData.marketCapUsd
          }, 'DexScreener market data');

          // Fallback chain: Redis cache → Jupiter API → Calculate from market cap
          if (!marketData.priceUsd || marketData.priceUsd === 0) {
            marketData.priceUsd = await this.fetchPriceWithFallbacks(token.mint, token.marketCapUsd);
          }

          // Calculate new state
          const newStatus = this.deps.stateManager.classifyTokenState({
            bondingCurveProgress: token.bondingCurveProgress,
            lastTradeTs: token.lastTradeTs,
            volume24hSol: token.volume24hSol,
            holderCount: token.holderCount,
            hasFirstTrade: !!token.lastTradeTs,
          });

          // Build update object
          const updateData: any = {
            status: newStatus,
            lastUpdatedAt: new Date(),
          };

          // Market data fields
          if (marketData.marketCapUsd) updateData.marketCapUsd = new Decimal(marketData.marketCapUsd);
          if (marketData.volume24h) {
            updateData.volume24h = new Decimal(marketData.volume24h);
            // Convert USD volume to SOL volume
            const solPrice = priceServiceClient.getSolPrice();
            if (solPrice > 0) {
              updateData.volume24hSol = new Decimal(marketData.volume24h / solPrice);
            }
          }
          if (marketData.volumeChange24h) updateData.volumeChange24h = new Decimal(marketData.volumeChange24h);
          if (marketData.priceUsd && marketData.priceUsd > 0) updateData.priceUsd = new Decimal(marketData.priceUsd);
          if (marketData.priceChange24h) updateData.priceChange24h = new Decimal(marketData.priceChange24h);
          if (marketData.txCount24h) updateData.txCount24h = marketData.txCount24h;

          logger.info({
            mint: token.mint.slice(0, 8),
            priceUsd: marketData.priceUsd,
            willSave: !!(marketData.priceUsd && marketData.priceUsd > 0),
            marketCapUsd: marketData.marketCapUsd,
            priceChange24h: marketData.priceChange24h
          }, 'Market data before save');

          // Buffer market data updates (batch sync to DB later)
          await this.deps.bufferManager.bufferToken({
            mint: token.mint,
            status: newStatus,
            marketCapUsd: updateData.marketCapUsd ? parseFloat(updateData.marketCapUsd.toString()) : null,
            volume24h: updateData.volume24h ? parseFloat(updateData.volume24h.toString()) : null,
            volume24hSol: updateData.volume24hSol ? parseFloat(updateData.volume24hSol.toString()) : null,
            volumeChange24h: updateData.volumeChange24h ? parseFloat(updateData.volumeChange24h.toString()) : null,
            priceUsd: updateData.priceUsd ? parseFloat(updateData.priceUsd.toString()) : null,
            priceChange24h: updateData.priceChange24h ? parseFloat(updateData.priceChange24h.toString()) : null,
            txCount24h: updateData.txCount24h || null,
          });

          updated++;
        } catch (error) {
          logger.error({ mint: truncateWallet(token.mint), error }, 'Error updating token');
        }

        // Rate limit: delay between requests to avoid DexScreener 429 errors
        await new Promise(resolve => setTimeout(resolve, config.limits.RATE_LIMIT_DELAY_MS));
      }

      logger.debug({
        updated,
        total: activeTokens.length,
        operation: this.getName()
      }, 'Market data batch update completed');
    } catch (error) {
      logger.error({ error, operation: this.getName() }, 'Error in job');
    }
  }

  /**
   * Fetch price with fallback chain: Redis → Jupiter → Calculate from market cap
   */
  private async fetchPriceWithFallbacks(
    mint: string,
    marketCapUsd?: Decimal | null
  ): Promise<number | undefined> {
    // Try Redis cache first
    try {
      const cachedPrice = await priceServiceClient.getPrice(mint);
      if (cachedPrice && cachedPrice > 0) {
        logger.debug({ mint: mint.slice(0, 8), price: cachedPrice }, 'Using cached price from Redis');
        return cachedPrice;
      }
    } catch (err) {
      logger.debug({ mint: mint.slice(0, 8), err }, 'Redis price cache lookup failed');
    }

    // Try Jupiter as fallback
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://lite-api.jup.ag/price/v3?ids=${mint}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'VirtualSol/1.0'
          }
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[mint] && data.data[mint].price) {
          const jupiterPrice = parseFloat(data.data[mint].price);
          if (jupiterPrice > 0) {
            logger.debug({ mint: mint.slice(0, 8), price: jupiterPrice }, 'Using Jupiter price fallback');
            return jupiterPrice;
          }
        }
      } else if (response.status === 204) {
        logger.debug({ mint: mint.slice(0, 8) }, 'Jupiter returned 204 (no price data)');
      } else {
        logger.debug({ mint: mint.slice(0, 8), status: response.status }, 'Jupiter API error');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        logger.debug({ mint: mint.slice(0, 8), err: err.message }, 'Jupiter price fallback failed');
      }
    }

    // Final fallback: Calculate price from marketCap
    // Pump.fun tokens have 1 billion total supply
    const finalMarketCap = marketCapUsd ? parseFloat(marketCapUsd.toString()) : null;
    if (finalMarketCap && finalMarketCap > 0) {
      const calculatedPrice = finalMarketCap / config.scoring.PUMP_TOTAL_SUPPLY;
      logger.debug({
        mint: mint.slice(0, 8),
        marketCap: finalMarketCap,
        calculatedPrice,
        source: 'database-cached'
      }, 'Calculated price from marketCap');
      return calculatedPrice;
    }

    return undefined;
  }
}
