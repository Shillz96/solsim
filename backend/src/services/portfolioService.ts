import { PrismaClient, Holding, Trade } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { calculatePnL, PnLResult } from '../shared/utils/pnlCalculator.js';
import { logger } from '../utils/logger.js';
import prisma from '../lib/prisma.js';

/**
 * Portfolio Service - Unified portfolio data aggregation
 * 
 * This service handles all portfolio-related queries with:
 * - Optimized database queries (avoiding N+1 problems)
 * - Efficient aggregations and calculations
 * - Type-safe PnL calculations using shared calculator
 * - Proper error handling and logging
 * 
 * Best Practices Applied:
 * - Single PrismaClient instance (reused from lib/prisma)
 * - Batch queries with `include` to avoid N+1
 * - Composite indexes for optimal query performance
 * - Array transactions for independent operations
 * - Decimal.js for precise financial calculations
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PortfolioPosition {
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  tokenImageUrl: string | null;
  quantity: string;
  entryPrice: string;
  avgBuyMarketCap: string | null;
  currentPrice: number;
  pnl: PnLResult;
}

export interface PortfolioSummary {
  totalValue: {
    sol: string;
    usd: string;
  };
  totalInvested: {
    sol: string;
    usd: string;
  };
  totalPnL: {
    sol: string;
    usd: string;
    percent: number;
  };
  positionCount: number;
  solBalance: string;
  positions: PortfolioPosition[];
}

export interface TradeHistory {
  trades: Trade[];
  summary: {
    totalTrades: number;
    totalBuys: number;
    totalSells: number;
    totalVolumeSol: string;
    realizedPnLSol: string;
  };
}

export interface TokenPerformance {
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  totalBought: string;
  totalSold: string;
  currentHolding: string;
  avgBuyPrice: string;
  avgSellPrice: string | null;
  realizedPnL: string;
  unrealizedPnL: string | null;
  totalTrades: number;
}

// ============================================================================
// PORTFOLIO SERVICE CLASS
// ============================================================================

export class PortfolioService {
  
  /**
   * Get user's complete portfolio with current prices
   * 
   * Optimizations:
   * - Single query with include to fetch holdings + user
   * - Batch price fetching (can be extended with price service)
   * - Efficient PnL calculations using shared calculator
   * 
   * @param userId - User ID to fetch portfolio for
   * @param currentPrices - Map of token addresses to current prices (USD)
   * @param solPriceUsd - Current SOL price in USD
   */
  async getPortfolio(
    userId: string,
    currentPrices: Map<string, number>,
    solPriceUsd: number
  ): Promise<PortfolioSummary> {
    try {
      // Single optimized query - fetches user + all holdings in one roundtrip
      // Uses composite index: @@index([userId, updatedAt])
      const userData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          holdings: {
            where: {
              quantity: {
                gt: 0, // Only active positions
              },
            },
            orderBy: {
              updatedAt: 'desc', // Most recently updated first
            },
          },
        },
      });

      if (!userData) {
        throw new Error(`User not found: ${userId}`);
      }

      // Calculate positions with PnL
      const positions: PortfolioPosition[] = [];
      let totalInvestedSol = new Decimal(0);
      let totalInvestedUsd = new Decimal(0);
      let totalCurrentValueSol = new Decimal(0);
      let totalCurrentValueUsd = new Decimal(0);

      for (const holding of userData.holdings) {
        const currentPrice = currentPrices.get(holding.tokenAddress) || 0;
        
        // Use shared PnL calculator for consistency
        const pnl = calculatePnL({
          quantity: holding.quantity,
          entryPriceSol: holding.entryPrice,
          currentPriceUsd: currentPrice,
          solPriceUsd,
        });

        positions.push({
          tokenAddress: holding.tokenAddress,
          tokenSymbol: holding.tokenSymbol,
          tokenName: holding.tokenName,
          tokenImageUrl: holding.tokenImageUrl,
          quantity: holding.quantity.toString(),
          entryPrice: holding.entryPrice.toString(),
          avgBuyMarketCap: holding.avgBuyMarketCap?.toString() || null,
          currentPrice,
          pnl,
        });

        // Aggregate totals
        totalInvestedSol = totalInvestedSol.add(pnl.investedSol);
        totalInvestedUsd = totalInvestedUsd.add(pnl.investedUsd);
        totalCurrentValueSol = totalCurrentValueSol.add(pnl.currentValueSol);
        totalCurrentValueUsd = totalCurrentValueUsd.add(pnl.currentValueUsd);
      }

      // Calculate overall portfolio PnL
      const totalPnLSol = totalCurrentValueSol.sub(totalInvestedSol);
      const totalPnLUsd = totalCurrentValueUsd.sub(totalInvestedUsd);
      const totalPnLPercent = totalInvestedUsd.eq(0)
        ? 0
        : totalPnLUsd.div(totalInvestedUsd).mul(100).toNumber();

      return {
        totalValue: {
          sol: totalCurrentValueSol.toFixed(8),
          usd: totalCurrentValueUsd.toFixed(2),
        },
        totalInvested: {
          sol: totalInvestedSol.toFixed(8),
          usd: totalInvestedUsd.toFixed(2),
        },
        totalPnL: {
          sol: totalPnLSol.toFixed(8),
          usd: totalPnLUsd.toFixed(2),
          percent: Number(totalPnLPercent.toFixed(2)),
        },
        positionCount: positions.length,
        solBalance: userData.virtualSolBalance.toString(),
        positions,
      };
    } catch (error) {
      logger.error('Error fetching portfolio:', error);
      throw error;
    }
  }

  /**
   * Get user's trade history with optional filtering
   * 
   * Optimizations:
   * - Uses composite index: @@index([userId, timestamp])
   * - Efficient aggregations for summary stats
   * - Optional pagination support
   * 
   * @param userId - User ID to fetch trades for
   * @param options - Filtering and pagination options
   */
  async getTradeHistory(
    userId: string,
    options?: {
      tokenAddress?: string;
      action?: 'buy' | 'sell';
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<TradeHistory> {
    try {
      // Build where clause
      const where: any = { userId };
      
      if (options?.tokenAddress) {
        where.tokenAddress = options.tokenAddress;
      }
      
      if (options?.action) {
        where.action = options.action.toUpperCase();
      }
      
      if (options?.startDate || options?.endDate) {
        where.timestamp = {};
        if (options.startDate) where.timestamp.gte = options.startDate;
        if (options.endDate) where.timestamp.lte = options.endDate;
      }

      // Array transaction for independent operations (billed as 1 operation)
      // More efficient than interactive transaction for independent queries
      const [trades, aggregates] = await prisma.$transaction([
        // Fetch trades with pagination
        prisma.trade.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: options?.limit || 100,
          skip: options?.offset || 0,
        }),
        
        // Aggregate statistics
        prisma.trade.aggregate({
          where,
          _count: true,
          _sum: {
            totalCost: true,
            realizedPnL: true,
          },
        }),
      ]);

      // Count by action type (efficient aggregation)
      const actionCounts = await prisma.trade.groupBy({
        by: ['action'],
        where,
        _count: true,
      });

      const buyCount = actionCounts.find(a => a.action === 'BUY')?._count || 0;
      const sellCount = actionCounts.find(a => a.action === 'SELL')?._count || 0;

      return {
        trades,
        summary: {
          totalTrades: aggregates._count,
          totalBuys: buyCount,
          totalSells: sellCount,
          totalVolumeSol: aggregates._sum.totalCost?.toString() || '0',
          realizedPnLSol: aggregates._sum.realizedPnL?.toString() || '0',
        },
      };
    } catch (error) {
      logger.error('Error fetching trade history:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific token
   * 
   * Optimizations:
   * - Uses composite index: @@index([userId, tokenAddress, timestamp])
   * - Efficient aggregations with groupBy
   * - Batch calculations for buy/sell averages
   * 
   * @param userId - User ID
   * @param tokenAddress - Token address to analyze
   */
  async getTokenPerformance(
    userId: string,
    tokenAddress: string
  ): Promise<TokenPerformance | null> {
    try {
      // Fetch trades and current holding in parallel
      const [trades, holding] = await prisma.$transaction([
        prisma.trade.findMany({
          where: { userId, tokenAddress },
          orderBy: { timestamp: 'desc' },
        }),
        
        prisma.holding.findUnique({
          where: {
            user_token_position: {
              userId,
              tokenAddress,
            },
          },
        }),
      ]);

      if (trades.length === 0) {
        return null;
      }

      // Calculate aggregates
      let totalBought = new Decimal(0);
      let totalSold = new Decimal(0);
      let totalBuyValue = new Decimal(0);
      let totalSellValue = new Decimal(0);
      let realizedPnL = new Decimal(0);

      for (const trade of trades) {
        if (trade.action === 'BUY') {
          totalBought = totalBought.add(trade.quantity);
          totalBuyValue = totalBuyValue.add(trade.totalCost);
        } else if (trade.action === 'SELL') {
          totalSold = totalSold.add(trade.quantity);
          totalSellValue = totalSellValue.add(trade.totalCost);
          if (trade.realizedPnL) {
            realizedPnL = realizedPnL.add(trade.realizedPnL);
          }
        }
      }

      const avgBuyPrice = totalBought.gt(0)
        ? totalBuyValue.div(totalBought)
        : new Decimal(0);
      
      const avgSellPrice = totalSold.gt(0)
        ? totalSellValue.div(totalSold)
        : null;

      return {
        tokenAddress,
        tokenSymbol: trades[0].tokenSymbol,
        tokenName: trades[0].tokenName,
        totalBought: totalBought.toString(),
        totalSold: totalSold.toString(),
        currentHolding: holding?.quantity.toString() || '0',
        avgBuyPrice: avgBuyPrice.toString(),
        avgSellPrice: avgSellPrice?.toString() || null,
        realizedPnL: realizedPnL.toString(),
        unrealizedPnL: holding?.quantity.toString() || null,
        totalTrades: trades.length,
      };
    } catch (error) {
      logger.error('Error fetching token performance:', error);
      throw error;
    }
  }

  /**
   * Get user's holdings (without PnL calculations)
   * Lightweight query for when you only need position data
   * 
   * @param userId - User ID
   */
  async getHoldings(userId: string): Promise<Holding[]> {
    try {
      // Uses composite index: @@unique([userId, tokenAddress])
      return await prisma.holding.findMany({
        where: {
          userId,
          quantity: {
            gt: 0,
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    } catch (error) {
      logger.error('Error fetching holdings:', error);
      throw error;
    }
  }

  /**
   * Get portfolio value over time (for charts)
   * 
   * @param userId - User ID
   * @param days - Number of days to look back (default: 30)
   */
  async getPortfolioHistory(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: Date; value: string }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all trades since start date
      // Uses composite index: @@index([userId, timestamp])
      const trades = await prisma.trade.findMany({
        where: {
          userId,
          timestamp: {
            gte: startDate,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
        select: {
          timestamp: true,
          totalCost: true,
          action: true,
        },
      });

      // Group by day and calculate cumulative value
      const dailyValues = new Map<string, Decimal>();
      let runningBalance = new Decimal(0);

      for (const trade of trades) {
        const dateKey = trade.timestamp.toISOString().split('T')[0];
        
        if (trade.action === 'BUY') {
          runningBalance = runningBalance.sub(trade.totalCost);
        } else {
          runningBalance = runningBalance.add(trade.totalCost);
        }
        
        dailyValues.set(dateKey, runningBalance);
      }

      return Array.from(dailyValues.entries()).map(([date, value]) => ({
        date: new Date(date),
        value: value.toString(),
      }));
    } catch (error) {
      logger.error('Error fetching portfolio history:', error);
      throw error;
    }
  }

  /**
   * Get top performing tokens for user
   * 
   * @param userId - User ID
   * @param limit - Number of tokens to return (default: 10)
   */
  async getTopPerformers(
    userId: string,
    currentPrices: Map<string, number>,
    solPriceUsd: number,
    limit: number = 10
  ): Promise<PortfolioPosition[]> {
    try {
      const portfolio = await this.getPortfolio(userId, currentPrices, solPriceUsd);
      
      // Sort by PnL percentage descending
      return portfolio.positions
        .sort((a, b) => b.pnl.pnlPercent - a.pnl.pnlPercent)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error fetching top performers:', error);
      throw error;
    }
  }

  /**
   * Get user's SOL balance
   * Lightweight query for balance checks
   * 
   * @param userId - User ID
   */
  async getBalance(userId: string): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { virtualSolBalance: true },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      return user.virtualSolBalance.toString();
    } catch (error) {
      logger.error('Error fetching balance:', error);
      throw error;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

// Export singleton instance (best practice - reuse service instance)
export const portfolioService = new PortfolioService();
