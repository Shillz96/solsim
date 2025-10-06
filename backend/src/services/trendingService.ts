import { Token, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger.js';
import { PriceService } from './priceService.js';
import prisma from '../lib/prisma.js';

/**
 * Trending Service - Token discovery and trending algorithms
 * 
 * This service handles trending token identification with:
 * - Multi-factor scoring algorithm
 * - Real-time metrics tracking
 * - Efficient database queries
 * - Caching for performance
 * - DexScreener-style trending logic
 * 
 * Trending Algorithm Factors:
 * 1. Volume (5m, 1h, 24h) - 40% weight
 * 2. Price momentum (5m, 1h, 24h) - 30% weight
 * 3. Trade activity - 15% weight
 * 4. Liquidity - 10% weight
 * 5. Recency - 5% weight
 * 
 * Best Practices:
 * - Indexed queries for performance
 * - Batch updates for efficiency
 * - Configurable scoring weights
 * - Time-based decay for freshness
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TrendingToken {
  address: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  price: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  volume5m: number;
  volume1h: number;
  volume24h: number;
  marketCap?: number;
  liquidity?: number;
  trendingScore: number;
  rank: number;
}

export interface TrendingMetrics {
  volume5m: number;
  volume1h: number;
  volume24h: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  marketCap?: number;
  liquidity?: number;
  lastUpdated: Date;
}

export interface ScoringWeights {
  volume: number;
  priceChange: number;
  tradeActivity: number;
  liquidity: number;
  recency: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_WEIGHTS: ScoringWeights = {
  volume: 0.40,
  priceChange: 0.30,
  tradeActivity: 0.15,
  liquidity: 0.10,
  recency: 0.05,
};

const TRENDING_CACHE_TTL = 60 * 1000; // 1 minute
const MIN_VOLUME_THRESHOLD = 1000; // $1,000 minimum volume
const MIN_LIQUIDITY_THRESHOLD = 5000; // $5,000 minimum liquidity
const MAX_TRENDING_TOKENS = 100; // Top 100 trending

// ============================================================================
// TRENDING SERVICE CLASS
// ============================================================================

export class TrendingService {
  private priceService: PriceService;
  private trendingCache: TrendingToken[] = [];
  private lastCacheUpdate: number = 0;
  private scoringWeights: ScoringWeights = DEFAULT_WEIGHTS;

  constructor(priceService: PriceService) {
    this.priceService = priceService;
  }

  /**
   * Get trending tokens with optional filtering
   * 
   * @param limit - Number of tokens to return (default: 50)
   * @param minVolume - Minimum 24h volume filter
   * @param minLiquidity - Minimum liquidity filter
   */
  async getTrending(
    limit: number = 50,
    minVolume?: number,
    minLiquidity?: number
  ): Promise<TrendingToken[]> {
    try {
      // Check cache first
      if (this.isCacheFresh()) {
        return this.applyFilters(this.trendingCache, limit, minVolume, minLiquidity);
      }

      // Calculate trending scores
      const trending = await this.calculateTrending();

      // Update cache
      this.trendingCache = trending;
      this.lastCacheUpdate = Date.now();

      return this.applyFilters(trending, limit, minVolume, minLiquidity);
    } catch (error) {
      logger.error('Error getting trending tokens:', error);
      throw error;
    }
  }

  /**
   * Calculate trending scores for all eligible tokens
   * 
   * Process:
   * 1. Fetch tokens with recent activity
   * 2. Apply minimum thresholds
   * 3. Calculate multi-factor scores
   * 4. Rank by score descending
   */
  private async calculateTrending(): Promise<TrendingToken[]> {
    try {
      // Fetch tokens with recent activity and sufficient volume
      // Uses indexes on volume fields for performance
      const tokens = await prisma.token.findMany({
        where: {
          AND: [
            { volume24h: { gte: new Decimal(MIN_VOLUME_THRESHOLD) } },
            { lastTs: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Last 24h
          ],
        },
        orderBy: {
          volume24h: 'desc',
        },
        take: 500, // Process top 500 by volume
      });

      logger.info(`Calculating trending scores for ${tokens.length} tokens`);

      // Calculate scores for each token
      const scoredTokens = tokens.map((token, index) => {
        const score = this.calculateTrendingScore(token);
        
        return {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          imageUrl: token.imageUrl,
          price: token.lastPrice?.toNumber() || 0,
          priceChange5m: token.priceChange5m?.toNumber() || 0,
          priceChange1h: token.priceChange1h?.toNumber() || 0,
          priceChange24h: token.priceChange24h?.toNumber() || 0,
          volume5m: token.volume5m?.toNumber() || 0,
          volume1h: token.volume1h?.toNumber() || 0,
          volume24h: token.volume24h?.toNumber() || 0,
          marketCap: undefined, // Can be fetched from price service if needed
          liquidity: undefined, // Can be fetched from price service if needed
          trendingScore: score,
          rank: 0, // Will be set after sorting
        };
      });

      // Sort by score descending
      scoredTokens.sort((a, b) => b.trendingScore - a.trendingScore);

      // Assign ranks
      scoredTokens.forEach((token, index) => {
        token.rank = index + 1;
      });

      // Return top trending
      return scoredTokens.slice(0, MAX_TRENDING_TOKENS);
    } catch (error) {
      logger.error('Error calculating trending tokens:', error);
      throw error;
    }
  }

  /**
   * Calculate trending score for a single token
   * Multi-factor algorithm with configurable weights
   * 
   * @param token - Token data from database
   */
  private calculateTrendingScore(token: Token): number {
    let score = 0;

    // 1. Volume Score (40% weight)
    // Weighted average: 50% recent (5m), 30% mid (1h), 20% long (24h)
    const volume5m = token.volume5m?.toNumber() || 0;
    const volume1h = token.volume1h?.toNumber() || 0;
    const volume24h = token.volume24h?.toNumber() || 0;
    
    const volumeScore = this.normalizeLog(
      volume5m * 0.5 + volume1h * 0.3 + volume24h * 0.2,
      1000,
      10000000
    );
    score += volumeScore * this.scoringWeights.volume;

    // 2. Price Change Score (30% weight)
    // Weighted average: 50% recent (5m), 30% mid (1h), 20% long (24h)
    const priceChange5m = token.priceChange5m?.toNumber() || 0;
    const priceChange1h = token.priceChange1h?.toNumber() || 0;
    const priceChange24h = token.priceChange24h?.toNumber() || 0;
    
    const priceChangeScore = this.normalizePercentage(
      priceChange5m * 0.5 + priceChange1h * 0.3 + priceChange24h * 0.2,
      -50,
      200
    );
    score += priceChangeScore * this.scoringWeights.priceChange;

    // 3. Trade Activity Score (15% weight)
    // Higher activity = more trending
    // This would require Trade table aggregation - simplified here
    const activityScore = this.normalizeLog(volume24h / (token.lastPrice?.toNumber() || 1), 100, 1000000);
    score += activityScore * this.scoringWeights.tradeActivity;

    // 4. Liquidity Score (10% weight)
    // Would require external data - placeholder
    const liquidityScore = 0.5; // Placeholder
    score += liquidityScore * this.scoringWeights.liquidity;

    // 5. Recency Score (5% weight)
    // Decay based on last update time
    const recencyScore = this.calculateRecencyScore(token.lastTs);
    score += recencyScore * this.scoringWeights.recency;

    // Normalize final score to 0-100 range
    return Math.max(0, Math.min(100, score * 100));
  }

  /**
   * Normalize value using logarithmic scale
   * Good for values with exponential distribution (volume, market cap)
   */
  private normalizeLog(value: number, min: number, max: number): number {
    if (value <= min) return 0;
    if (value >= max) return 1;
    
    const logValue = Math.log10(value);
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    
    return (logValue - logMin) / (logMax - logMin);
  }

  /**
   * Normalize percentage values
   * Good for price changes (can be negative)
   */
  private normalizePercentage(value: number, min: number, max: number): number {
    if (value <= min) return 0;
    if (value >= max) return 1;
    return (value - min) / (max - min);
  }

  /**
   * Calculate recency score with exponential decay
   * Recent updates = higher score
   */
  private calculateRecencyScore(lastUpdate: Date | null): number {
    if (!lastUpdate) return 0;
    
    const ageMinutes = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
    
    // Exponential decay: score = e^(-age/30)
    // Half-life of ~20 minutes
    return Math.exp(-ageMinutes / 30);
  }

  /**
   * Apply filters to trending results
   */
  private applyFilters(
    tokens: TrendingToken[],
    limit: number,
    minVolume?: number,
    minLiquidity?: number
  ): TrendingToken[] {
    let filtered = tokens;

    if (minVolume) {
      filtered = filtered.filter(t => t.volume24h >= minVolume);
    }

    if (minLiquidity && minLiquidity > 0) {
      filtered = filtered.filter(t => (t.liquidity || 0) >= minLiquidity);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Check if cache is fresh
   */
  private isCacheFresh(): boolean {
    return (
      this.trendingCache.length > 0 &&
      Date.now() - this.lastCacheUpdate < TRENDING_CACHE_TTL
    );
  }

  /**
   * Update token metrics
   * Call this periodically to keep trending data fresh
   * 
   * @param tokenAddress - Token to update
   * @param metrics - New metrics
   */
  async updateTokenMetrics(
    tokenAddress: string,
    metrics: Partial<TrendingMetrics>
  ): Promise<void> {
    try {
      await prisma.token.upsert({
        where: { address: tokenAddress },
        create: {
          address: tokenAddress,
          volume5m: metrics.volume5m ? new Decimal(metrics.volume5m) : new Decimal(0),
          volume1h: metrics.volume1h ? new Decimal(metrics.volume1h) : new Decimal(0),
          volume24h: metrics.volume24h ? new Decimal(metrics.volume24h) : new Decimal(0),
          priceChange5m: metrics.priceChange5m ? new Decimal(metrics.priceChange5m) : new Decimal(0),
          priceChange1h: metrics.priceChange1h ? new Decimal(metrics.priceChange1h) : new Decimal(0),
          priceChange24h: metrics.priceChange24h ? new Decimal(metrics.priceChange24h) : new Decimal(0),
          lastTs: new Date(),
        },
        update: {
          volume5m: metrics.volume5m ? new Decimal(metrics.volume5m) : undefined,
          volume1h: metrics.volume1h ? new Decimal(metrics.volume1h) : undefined,
          volume24h: metrics.volume24h ? new Decimal(metrics.volume24h) : undefined,
          priceChange5m: metrics.priceChange5m ? new Decimal(metrics.priceChange5m) : undefined,
          priceChange1h: metrics.priceChange1h ? new Decimal(metrics.priceChange1h) : undefined,
          priceChange24h: metrics.priceChange24h ? new Decimal(metrics.priceChange24h) : undefined,
          lastTs: new Date(),
        },
      });

      // Invalidate cache
      this.clearCache();
    } catch (error) {
      logger.error(`Error updating metrics for ${tokenAddress}:`, error);
      throw error;
    }
  }

  /**
   * Batch update token metrics
   * More efficient for multiple tokens
   * 
   * @param updates - Map of token addresses to metrics
   */
  async batchUpdateMetrics(
    updates: Map<string, Partial<TrendingMetrics>>
  ): Promise<void> {
    try {
      logger.info(`Batch updating metrics for ${updates.size} tokens`);

      // Use array transaction for efficiency
      const operations = Array.from(updates.entries()).map(([address, metrics]) =>
        prisma.token.upsert({
          where: { address },
          create: {
            address,
            volume5m: metrics.volume5m ? new Decimal(metrics.volume5m) : new Decimal(0),
            volume1h: metrics.volume1h ? new Decimal(metrics.volume1h) : new Decimal(0),
            volume24h: metrics.volume24h ? new Decimal(metrics.volume24h) : new Decimal(0),
            priceChange5m: metrics.priceChange5m ? new Decimal(metrics.priceChange5m) : new Decimal(0),
            priceChange1h: metrics.priceChange1h ? new Decimal(metrics.priceChange1h) : new Decimal(0),
            priceChange24h: metrics.priceChange24h ? new Decimal(metrics.priceChange24h) : new Decimal(0),
            lastTs: new Date(),
          },
          update: {
            volume5m: metrics.volume5m ? new Decimal(metrics.volume5m) : undefined,
            volume1h: metrics.volume1h ? new Decimal(metrics.volume1h) : undefined,
            volume24h: metrics.volume24h ? new Decimal(metrics.volume24h) : undefined,
            priceChange5m: metrics.priceChange5m ? new Decimal(metrics.priceChange5m) : undefined,
            priceChange1h: metrics.priceChange1h ? new Decimal(metrics.priceChange1h) : undefined,
            priceChange24h: metrics.priceChange24h ? new Decimal(metrics.priceChange24h) : undefined,
            lastTs: new Date(),
          },
        })
      );

      // Execute in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        await prisma.$transaction(batch);
      }

      // Invalidate cache
      this.clearCache();

      logger.info('Batch update completed successfully');
    } catch (error) {
      logger.error('Error in batch update:', error);
      throw error;
    }
  }

  /**
   * Get trending tokens by specific category
   * 
   * @param category - 'gainers' | 'losers' | 'volume'
   * @param limit - Number of tokens to return
   */
  async getTrendingByCategory(
    category: 'gainers' | 'losers' | 'volume',
    limit: number = 20
  ): Promise<TrendingToken[]> {
    try {
      const trending = await this.getTrending(500); // Get large set first

      switch (category) {
        case 'gainers':
          return trending
            .filter(t => t.priceChange24h > 0)
            .sort((a, b) => b.priceChange24h - a.priceChange24h)
            .slice(0, limit);

        case 'losers':
          return trending
            .filter(t => t.priceChange24h < 0)
            .sort((a, b) => a.priceChange24h - b.priceChange24h)
            .slice(0, limit);

        case 'volume':
          return trending
            .sort((a, b) => b.volume24h - a.volume24h)
            .slice(0, limit);

        default:
          return trending.slice(0, limit);
      }
    } catch (error) {
      logger.error(`Error getting ${category} tokens:`, error);
      throw error;
    }
  }

  /**
   * Configure scoring weights
   * Allows customization of trending algorithm
   */
  setWeights(weights: Partial<ScoringWeights>): void {
    this.scoringWeights = {
      ...this.scoringWeights,
      ...weights,
    };

    // Validate weights sum to 1.0
    const sum = Object.values(this.scoringWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      logger.warn(`Scoring weights sum to ${sum}, should be 1.0`);
    }

    // Invalidate cache when weights change
    this.clearCache();
  }

  /**
   * Clear trending cache
   */
  clearCache(): void {
    this.trendingCache = [];
    this.lastCacheUpdate = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; age: number; isFresh: boolean } {
    return {
      size: this.trendingCache.length,
      age: Date.now() - this.lastCacheUpdate,
      isFresh: this.isCacheFresh(),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

import { priceService } from './priceService.js';
export const trendingService = new TrendingService(priceService);
