import { Decimal } from '@prisma/client/runtime/library';
import { transactionService } from './transactionService.js';
import { logger } from '../utils/logger.js';

/**
 * FIFO Cost Basis Calculator - Accurate cost tracking for tax and PnL reporting
 * 
 * Implements First-In-First-Out (FIFO) cost basis calculation:
 * - Tracks individual purchase lots
 * - Consumes oldest lots first when selling
 * - Calculates realized and unrealized PnL accurately
 * - SOL-native calculations to avoid USD conversion errors
 * 
 * Benefits over average cost:
 * - More accurate for tax reporting
 * - Better tracking of individual trade performance
 * - Handles partial sells correctly
 * - Maintains lot integrity for audit trails
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CostBasisResult {
  tokenAddress: string;
  tokenSymbol: string | null;
  totalQuantity: Decimal;
  totalCostBasisSol: Decimal;
  avgPricePerTokenSol: Decimal;
  unrealizedPnLSol: Decimal | null; // Requires current price
  unrealizedPnLPercent: number | null;
  lots: LotDetail[];
}

export interface LotDetail {
  transactionId: string;
  quantity: Decimal;
  remainingQuantity: Decimal;
  pricePerTokenSol: Decimal;
  costBasisSol: Decimal;
  acquiredAt: Date;
  ageInDays: number;
}

export interface RealizedPnLResult {
  totalRealizedPnLSol: Decimal;
  winCount: number;
  lossCount: number;
  avgWinSol: Decimal;
  avgLossSol: Decimal;
  winRate: number;
}

// ============================================================================
// COST BASIS CALCULATOR CLASS
// ============================================================================

export class CostBasisCalculator {
  
  /**
   * Calculate FIFO cost basis for a user's token position
   */
  async calculateCostBasis(
    userId: string,
    tokenAddress: string,
    currentPriceSol?: number
  ): Promise<CostBasisResult | null> {
    try {
      // Get FIFO cost basis from transaction service
      const fifoData = await transactionService.getFIFOCostBasis(userId, tokenAddress);
      
      if (fifoData.totalQuantity.eq(0)) {
        logger.debug(`[CostBasisCalculator] No position found for token ${tokenAddress}`);
        return null;
      }
      
      // Get token metadata from first transaction
      const transactions = await transactionService.getTokenTransactions(userId, tokenAddress, 1);
      const tokenSymbol = transactions[0]?.tokenSymbol || null;
      
      // Convert lots to detailed format
      const now = new Date();
      const lots: LotDetail[] = fifoData.lots.map(lot => ({
        transactionId: lot.id,
        quantity: lot.quantity,
        remainingQuantity: lot.remainingQuantity,
        pricePerTokenSol: lot.pricePerTokenSol,
        costBasisSol: lot.costBasisSol,
        acquiredAt: lot.executedAt,
        ageInDays: Math.floor((now.getTime() - lot.executedAt.getTime()) / (1000 * 60 * 60 * 24)),
      }));
      
      // Calculate unrealized PnL if current price provided
      let unrealizedPnLSol: Decimal | null = null;
      let unrealizedPnLPercent: number | null = null;
      
      if (currentPriceSol && currentPriceSol > 0) {
        const currentValueSol = fifoData.totalQuantity.mul(currentPriceSol);
        unrealizedPnLSol = currentValueSol.sub(fifoData.totalCostBasisSol);
        
        if (fifoData.totalCostBasisSol.gt(0)) {
          unrealizedPnLPercent = unrealizedPnLSol
            .div(fifoData.totalCostBasisSol)
            .mul(100)
            .toNumber();
        }
      }
      
      return {
        tokenAddress,
        tokenSymbol,
        totalQuantity: fifoData.totalQuantity,
        totalCostBasisSol: fifoData.totalCostBasisSol,
        avgPricePerTokenSol: fifoData.avgPricePerTokenSol,
        unrealizedPnLSol,
        unrealizedPnLPercent,
        lots,
      };
    } catch (error) {
      logger.error('[CostBasisCalculator] Failed to calculate cost basis:', error);
      throw error;
    }
  }
  
  /**
   * Calculate cost basis for all user positions
   */
  async calculateAllPositions(
    userId: string,
    currentPrices?: Map<string, number>
  ): Promise<CostBasisResult[]> {
    try {
      // Get unique token addresses from transactions
      const transactions = await transactionService.getUserTransactions(userId);
      const tokenAddresses = new Set<string>();
      
      for (const tx of transactions) {
        if (tx.remainingQuantity && new Decimal(tx.remainingQuantity).gt(0)) {
          tokenAddresses.add(tx.tokenAddress);
        }
      }
      
      const results: CostBasisResult[] = [];
      
      for (const tokenAddress of tokenAddresses) {
        const currentPriceSol = currentPrices?.get(tokenAddress);
        const costBasis = await this.calculateCostBasis(userId, tokenAddress, currentPriceSol);
        
        if (costBasis && costBasis.totalQuantity.gt(0)) {
          results.push(costBasis);
        }
      }
      
      logger.info(`[CostBasisCalculator] Calculated cost basis for ${results.length} positions`);
      
      return results;
    } catch (error) {
      logger.error('[CostBasisCalculator] Failed to calculate all positions:', error);
      throw error;
    }
  }
  
  /**
   * Calculate realized PnL statistics for a user
   */
  async calculateRealizedPnL(
    userId: string,
    tokenAddress?: string
  ): Promise<RealizedPnLResult> {
    try {
      // Get sell transactions
      const sellTxs = tokenAddress
        ? await transactionService.getTokenTransactions(userId, tokenAddress)
        : await transactionService.getUserTransactions(userId);
      
      const sellTransactions = sellTxs.filter(tx => 
        tx.action === 'SELL' && tx.realizedPnLSol !== null
      );
      
      if (sellTransactions.length === 0) {
        return {
          totalRealizedPnLSol: new Decimal(0),
          winCount: 0,
          lossCount: 0,
          avgWinSol: new Decimal(0),
          avgLossSol: new Decimal(0),
          winRate: 0,
        };
      }
      
      let totalRealizedPnLSol = new Decimal(0);
      let winCount = 0;
      let lossCount = 0;
      let totalWinSol = new Decimal(0);
      let totalLossSol = new Decimal(0);
      
      for (const tx of sellTransactions) {
        const pnl = new Decimal(tx.realizedPnLSol!);
        totalRealizedPnLSol = totalRealizedPnLSol.add(pnl);
        
        if (pnl.gt(0)) {
          winCount++;
          totalWinSol = totalWinSol.add(pnl);
        } else if (pnl.lt(0)) {
          lossCount++;
          totalLossSol = totalLossSol.add(pnl.abs());
        }
      }
      
      const avgWinSol = winCount > 0 ? totalWinSol.div(winCount) : new Decimal(0);
      const avgLossSol = lossCount > 0 ? totalLossSol.div(lossCount) : new Decimal(0);
      const totalTrades = winCount + lossCount;
      const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
      
      return {
        totalRealizedPnLSol,
        winCount,
        lossCount,
        avgWinSol,
        avgLossSol,
        winRate,
      };
    } catch (error) {
      logger.error('[CostBasisCalculator] Failed to calculate realized PnL:', error);
      throw error;
    }
  }
  
  /**
   * Simulate FIFO sale to preview PnL impact
   */
  async simulateSale(
    userId: string,
    tokenAddress: string,
    quantityToSell: number | string | Decimal,
    sellPriceSol: number | string | Decimal
  ): Promise<{
    quantitySold: Decimal;
    totalRevenueSol: Decimal;
    totalCostBasisSol: Decimal;
    realizedPnLSol: Decimal;
    realizedPnLPercent: number;
    consumedLots: LotDetail[];
  }> {
    try {
      const quantity = new Decimal(quantityToSell);
      const pricePerToken = new Decimal(sellPriceSol);
      const totalRevenueSol = quantity.mul(pricePerToken);
      
      // Get available lots
      const availableLots = await transactionService.getAvailableLots(userId, tokenAddress);
      
      if (availableLots.length === 0) {
        throw new Error('No lots available for sale');
      }
      
      // Simulate FIFO consumption
      let remainingToSell = quantity;
      let totalCostBasisSol = new Decimal(0);
      const consumedLots: LotDetail[] = [];
      const now = new Date();
      
      for (const lot of availableLots) {
        if (remainingToSell.lte(0)) break;
        
        const lotRemaining = new Decimal(lot.remainingQuantity);
        const consumeQuantity = Decimal.min(remainingToSell, lotRemaining);
        const lotPricePerToken = new Decimal(lot.pricePerTokenSol);
        const lotCostBasis = consumeQuantity.mul(lotPricePerToken);
        
        totalCostBasisSol = totalCostBasisSol.add(lotCostBasis);
        
        consumedLots.push({
          transactionId: lot.id,
          quantity: new Decimal(lot.quantity),
          remainingQuantity: consumeQuantity,
          pricePerTokenSol: lotPricePerToken,
          costBasisSol: lotCostBasis,
          acquiredAt: lot.executedAt,
          ageInDays: Math.floor((now.getTime() - lot.executedAt.getTime()) / (1000 * 60 * 60 * 24)),
        });
        
        remainingToSell = remainingToSell.sub(consumeQuantity);
      }
      
      const quantitySold = quantity.sub(remainingToSell);
      const actualRevenueSol = quantitySold.mul(pricePerToken);
      const realizedPnLSol = actualRevenueSol.sub(totalCostBasisSol);
      const realizedPnLPercent = totalCostBasisSol.gt(0)
        ? realizedPnLSol.div(totalCostBasisSol).mul(100).toNumber()
        : 0;
      
      return {
        quantitySold,
        totalRevenueSol: actualRevenueSol,
        totalCostBasisSol,
        realizedPnLSol,
        realizedPnLPercent,
        consumedLots,
      };
    } catch (error) {
      logger.error('[CostBasisCalculator] Failed to simulate sale:', error);
      throw error;
    }
  }
  
  /**
   * Get tax lot details for reporting
   */
  async getTaxLots(
    userId: string,
    tokenAddress?: string,
    year?: number
  ): Promise<{
    shortTermLots: LotDetail[];
    longTermLots: LotDetail[];
    totalShortTermBasis: Decimal;
    totalLongTermBasis: Decimal;
  }> {
    try {
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
      
      // Get all positions or specific token
      const positions = tokenAddress
        ? [await this.calculateCostBasis(userId, tokenAddress)]
        : await this.calculateAllPositions(userId);
      
      const shortTermLots: LotDetail[] = [];
      const longTermLots: LotDetail[] = [];
      let totalShortTermBasis = new Decimal(0);
      let totalLongTermBasis = new Decimal(0);
      
      for (const position of positions) {
        if (!position) continue;
        
        for (const lot of position.lots) {
          // Filter by year if specified
          if (year && lot.acquiredAt.getFullYear() !== year) continue;
          
          if (lot.acquiredAt > oneYearAgo) {
            // Short-term (held < 1 year)
            shortTermLots.push(lot);
            totalShortTermBasis = totalShortTermBasis.add(lot.costBasisSol);
          } else {
            // Long-term (held >= 1 year)
            longTermLots.push(lot);
            totalLongTermBasis = totalLongTermBasis.add(lot.costBasisSol);
          }
        }
      }
      
      return {
        shortTermLots,
        longTermLots,
        totalShortTermBasis,
        totalLongTermBasis,
      };
    } catch (error) {
      logger.error('[CostBasisCalculator] Failed to get tax lots:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const costBasisCalculator = new CostBasisCalculator();
