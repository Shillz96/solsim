import { TransactionHistory, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Transaction Service - Records and manages transaction history for FIFO tracking
 * 
 * This service provides:
 * - Recording of buy/sell transactions with SOL-native pricing
 * - FIFO lot tracking for accurate cost basis calculation
 * - Query methods for transaction history
 * - Migration support for existing holdings
 * 
 * Key Features:
 * - All prices stored in SOL (not USD) to avoid conversion errors
 * - Tracks remaining quantity for FIFO consumption
 * - Links to Trade records for audit trail
 * - Supports migrated entries for backward compatibility
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TransactionInput {
  userId: string;
  tokenAddress: string;
  tokenSymbol?: string | null;
  tokenName?: string | null;
  action: 'BUY' | 'SELL' | 'MIGRATED';
  quantity: Decimal | number | string;
  pricePerTokenSol: Decimal | number | string;
  totalCostSol: Decimal | number | string;
  feesSol?: Decimal | number | string;
  tradeId?: string | null;
  executedAt?: Date;
}

export interface FIFOLot {
  id: string;
  quantity: Decimal;
  remainingQuantity: Decimal;
  pricePerTokenSol: Decimal;
  costBasisSol: Decimal;
  executedAt: Date;
}

export interface TransactionResult {
  transaction: TransactionHistory;
  consumedLots?: FIFOLot[]; // For SELL transactions
  realizedPnLSol?: Decimal;
}

// ============================================================================
// TRANSACTION SERVICE CLASS
// ============================================================================

export class TransactionService {
  
  /**
   * Record a BUY transaction
   * Creates a new lot for FIFO tracking with full remaining quantity
   */
  async recordBuyTransaction(input: TransactionInput): Promise<TransactionResult> {
    try {
      const quantity = new Decimal(input.quantity);
      const pricePerTokenSol = new Decimal(input.pricePerTokenSol);
      const totalCostSol = new Decimal(input.totalCostSol);
      const feesSol = input.feesSol ? new Decimal(input.feesSol) : new Decimal(0);
      
      const transaction = await prisma.transactionHistory.create({
        data: {
          userId: input.userId,
          tokenAddress: input.tokenAddress,
          tokenSymbol: input.tokenSymbol,
          tokenName: input.tokenName,
          action: 'BUY',
          quantity,
          pricePerTokenSol,
          totalCostSol,
          feesSol,
          remainingQuantity: quantity, // Full quantity available for FIFO
          costBasisSol: totalCostSol,
          tradeId: input.tradeId,
          executedAt: input.executedAt || new Date(),
        },
      });
      
      logger.info(`[TransactionService] Recorded BUY transaction: ${quantity} tokens at ${pricePerTokenSol} SOL per token`);
      
      return { transaction };
    } catch (error) {
      logger.error('[TransactionService] Failed to record BUY transaction:', error);
      throw error;
    }
  }
  
  /**
   * Record a SELL transaction
   * Consumes lots using FIFO and calculates realized PnL
   */
  async recordSellTransaction(input: TransactionInput): Promise<TransactionResult> {
    try {
      const quantityToSell = new Decimal(input.quantity);
      const sellPricePerToken = new Decimal(input.pricePerTokenSol);
      const totalRevenueSol = new Decimal(input.totalCostSol);
      const feesSol = input.feesSol ? new Decimal(input.feesSol) : new Decimal(0);
      
      // Get available lots for FIFO consumption (oldest first)
      const availableLots = await this.getAvailableLots(
        input.userId,
        input.tokenAddress
      );
      
      if (availableLots.length === 0) {
        logger.warning('[TransactionService] No lots available for SELL - creating standalone transaction');
        // Record sell without FIFO (for incomplete history)
        const transaction = await prisma.transactionHistory.create({
          data: {
            userId: input.userId,
            tokenAddress: input.tokenAddress,
            tokenSymbol: input.tokenSymbol,
            tokenName: input.tokenName,
            action: 'SELL',
            quantity: quantityToSell,
            pricePerTokenSol: sellPricePerToken,
            totalCostSol: totalRevenueSol,
            feesSol,
            remainingQuantity: new Decimal(0),
            costBasisSol: new Decimal(0),
            realizedPnLSol: null, // Unknown PnL due to missing buy history
            tradeId: input.tradeId,
            executedAt: input.executedAt || new Date(),
          },
        });
        
        return { transaction };
      }
      
      // Consume lots using FIFO
      let remainingToSell = quantityToSell;
      const consumedLots: FIFOLot[] = [];
      let totalCostBasis = new Decimal(0);
      
      for (const lot of availableLots) {
        if (remainingToSell.lte(0)) break;
        
        const lotRemaining = new Decimal(lot.remainingQuantity);
        const consumeQuantity = Decimal.min(remainingToSell, lotRemaining);
        
        // Calculate cost basis for consumed portion
        const lotCostBasis = consumeQuantity.mul(lot.pricePerTokenSol);
        totalCostBasis = totalCostBasis.add(lotCostBasis);
        
        // Update lot's remaining quantity
        await prisma.transactionHistory.update({
          where: { id: lot.id },
          data: {
            remainingQuantity: lotRemaining.sub(consumeQuantity),
          },
        });
        
        consumedLots.push({
          id: lot.id,
          quantity: new Decimal(lot.quantity),
          remainingQuantity: consumeQuantity,
          pricePerTokenSol: new Decimal(lot.pricePerTokenSol),
          costBasisSol: lotCostBasis,
          executedAt: lot.executedAt,
        });
        
        remainingToSell = remainingToSell.sub(consumeQuantity);
      }
      
      // Calculate realized PnL (revenue - cost basis - fees)
      const realizedPnLSol = totalRevenueSol.sub(totalCostBasis).sub(feesSol);
      
      // Record the SELL transaction
      const transaction = await prisma.transactionHistory.create({
        data: {
          userId: input.userId,
          tokenAddress: input.tokenAddress,
          tokenSymbol: input.tokenSymbol,
          tokenName: input.tokenName,
          action: 'SELL',
          quantity: quantityToSell,
          pricePerTokenSol: sellPricePerToken,
          totalCostSol: totalRevenueSol,
          feesSol,
          remainingQuantity: new Decimal(0),
          costBasisSol: totalCostBasis,
          realizedPnLSol,
          tradeId: input.tradeId,
          executedAt: input.executedAt || new Date(),
        },
      });
      
      logger.info(
        `[TransactionService] Recorded SELL transaction: ${quantityToSell} tokens at ${sellPricePerToken} SOL per token, ` +
        `realized PnL: ${realizedPnLSol} SOL`
      );
      
      return {
        transaction,
        consumedLots,
        realizedPnLSol,
      };
    } catch (error) {
      logger.error('[TransactionService] Failed to record SELL transaction:', error);
      throw error;
    }
  }
  
  /**
   * Record a MIGRATED transaction for existing holdings
   * Used during migration from average cost to FIFO
   */
  async recordMigratedTransaction(input: TransactionInput): Promise<TransactionResult> {
    try {
      const quantity = new Decimal(input.quantity);
      const pricePerTokenSol = new Decimal(input.pricePerTokenSol);
      const totalCostSol = new Decimal(input.totalCostSol);
      
      const transaction = await prisma.transactionHistory.create({
        data: {
          userId: input.userId,
          tokenAddress: input.tokenAddress,
          tokenSymbol: input.tokenSymbol,
          tokenName: input.tokenName,
          action: 'MIGRATED',
          quantity,
          pricePerTokenSol,
          totalCostSol,
          feesSol: new Decimal(0),
          remainingQuantity: quantity, // Full quantity available for FIFO
          costBasisSol: totalCostSol,
          tradeId: null,
          executedAt: input.executedAt || new Date(),
        },
      });
      
      logger.info(`[TransactionService] Recorded MIGRATED transaction for existing holding: ${quantity} tokens`);
      
      return { transaction };
    } catch (error) {
      logger.error('[TransactionService] Failed to record MIGRATED transaction:', error);
      throw error;
    }
  }
  
  /**
   * Get available lots for FIFO consumption
   * Returns BUY/MIGRATED transactions with remaining quantity > 0
   */
  async getAvailableLots(
    userId: string,
    tokenAddress: string
  ): Promise<TransactionHistory[]> {
    return await prisma.transactionHistory.findMany({
      where: {
        userId,
        tokenAddress,
        action: { in: ['BUY', 'MIGRATED'] },
        remainingQuantity: { gt: 0 },
      },
      orderBy: {
        executedAt: 'asc', // FIFO: oldest first
      },
    });
  }
  
  /**
   * Get transaction history for a user's token
   */
  async getTokenTransactions(
    userId: string,
    tokenAddress: string,
    limit?: number
  ): Promise<TransactionHistory[]> {
    return await prisma.transactionHistory.findMany({
      where: {
        userId,
        tokenAddress,
      },
      orderBy: {
        executedAt: 'desc',
      },
      take: limit,
    });
  }
  
  /**
   * Get all transactions for a user
   */
  async getUserTransactions(
    userId: string,
    limit?: number
  ): Promise<TransactionHistory[]> {
    return await prisma.transactionHistory.findMany({
      where: { userId },
      orderBy: {
        executedAt: 'desc',
      },
      take: limit,
    });
  }
  
  /**
   * Calculate total realized PnL for a user
   */
  async getTotalRealizedPnL(userId: string): Promise<Decimal> {
    const result = await prisma.transactionHistory.aggregate({
      where: {
        userId,
        action: 'SELL',
        realizedPnLSol: { not: null },
      },
      _sum: {
        realizedPnLSol: true,
      },
    });
    
    return result._sum.realizedPnLSol || new Decimal(0);
  }
  
  /**
   * Get cost basis for current holdings using FIFO
   */
  async getFIFOCostBasis(
    userId: string,
    tokenAddress: string
  ): Promise<{
    totalQuantity: Decimal;
    totalCostBasisSol: Decimal;
    avgPricePerTokenSol: Decimal;
    lots: FIFOLot[];
  }> {
    const availableLots = await this.getAvailableLots(userId, tokenAddress);
    
    let totalQuantity = new Decimal(0);
    let totalCostBasisSol = new Decimal(0);
    const lots: FIFOLot[] = [];
    
    for (const lot of availableLots) {
      const remaining = new Decimal(lot.remainingQuantity);
      const pricePerToken = new Decimal(lot.pricePerTokenSol);
      const lotCost = remaining.mul(pricePerToken);
      
      totalQuantity = totalQuantity.add(remaining);
      totalCostBasisSol = totalCostBasisSol.add(lotCost);
      
      lots.push({
        id: lot.id,
        quantity: new Decimal(lot.quantity),
        remainingQuantity: remaining,
        pricePerTokenSol: pricePerToken,
        costBasisSol: lotCost,
        executedAt: lot.executedAt,
      });
    }
    
    const avgPricePerTokenSol = totalQuantity.gt(0)
      ? totalCostBasisSol.div(totalQuantity)
      : new Decimal(0);
    
    return {
      totalQuantity,
      totalCostBasisSol,
      avgPricePerTokenSol,
      lots,
    };
  }
  
  /**
   * Migrate existing holdings to transaction history
   * Creates MIGRATED transactions for holdings without transaction history
   */
  async migrateExistingHoldings(userId: string): Promise<number> {
    try {
      // Get user's current holdings
      const holdings = await prisma.holding.findMany({
        where: {
          userId,
          quantity: { gt: 0 },
        },
      });
      
      let migrated = 0;
      
      for (const holding of holdings) {
        // Check if we already have transactions for this token
        const existingTxCount = await prisma.transactionHistory.count({
          where: {
            userId,
            tokenAddress: holding.tokenAddress,
          },
        });
        
        if (existingTxCount === 0) {
          // No transaction history - create MIGRATED entry
          const quantity = new Decimal(holding.quantity);
          const entryPriceUsd = new Decimal(holding.entryPrice);
          
          // Convert USD entry price to SOL (approximate)
          // This will be improved when we fetch current SOL price
          const SOL_PRICE_ESTIMATE = 240; // Default estimate
          const pricePerTokenSol = entryPriceUsd.div(SOL_PRICE_ESTIMATE);
          const totalCostSol = quantity.mul(pricePerTokenSol);
          
          await this.recordMigratedTransaction({
            userId,
            tokenAddress: holding.tokenAddress,
            tokenSymbol: holding.tokenSymbol,
            tokenName: holding.tokenName,
            action: 'MIGRATED',
            quantity,
            pricePerTokenSol,
            totalCostSol,
            executedAt: holding.updatedAt,
          });
          
          migrated++;
        }
      }
      
      logger.info(`[TransactionService] Migrated ${migrated} existing holdings to transaction history`);
      return migrated;
    } catch (error) {
      logger.error('[TransactionService] Failed to migrate existing holdings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
