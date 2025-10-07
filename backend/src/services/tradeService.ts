import { Trade, User, Holding, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger.js';
import { PriceService } from './priceService.js';
import { transactionService } from './transactionService.js';
import prisma from '../lib/prisma.js';

/**
 * Trade Service - Unified trade execution and management
 * 
 * This service handles all trade-related operations with:
 * - Atomic transactions (ACID compliance)
 * - Precise decimal calculations for financial accuracy
 * - Automatic holding updates
 * - PnL tracking for sells
 * - Balance management
 * - Transaction rollback on errors
 * 
 * Trade Flow:
 * 1. Validate user balance/holdings
 * 2. Fetch current price
 * 3. Calculate quantities and costs
 * 4. Execute trade in transaction:
 *    - Create trade record
 *    - Update/create holding
 *    - Update user balance
 * 5. Broadcast updates (if callbacks provided)
 * 
 * Best Practices:
 * - Interactive transactions for dependent operations
 * - Serializable isolation level for critical operations
 * - Decimal.js for precise financial math
 * - Comprehensive error handling
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TradeRequest {
  tokenAddress: string;
  amountSol: number; // Amount in SOL (for both buy and sell)
  // Optional metadata fields
  tokenSymbol?: string;
  tokenName?: string;
  tokenImageUrl?: string;
}

export interface InternalTradeRequest {
  userId: string;
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenImageUrl?: string;
  action: 'BUY' | 'SELL';
  quantity: string; // Token quantity as string for Decimal precision
  price: string; // Price per token in USD as string
  marketCapUsd?: number;
  pricePerTokenSol?: number; // SOL price per token for transaction recording
}

export interface TradeResult {
  trade: Trade;
  updatedBalance: Decimal;
  updatedHolding?: Holding;
  realizedPnL?: Decimal;
}

export interface SerializedTradeResult {
  trade: any;
  updatedBalance: string;
  updatedHolding?: any;
  realizedPnL?: string;
}

// Broadcast functions for real-time updates
export interface BroadcastFunctions {
  broadcastPortfolioUpdate?: (userId: string, data: any) => void;
  broadcastBalanceUpdate?: (userId: string, newBalance: number) => void;
  broadcastTradeExecuted?: (userId: string, tradeData: any) => void;
}

// ============================================================================
// TRADE SERVICE CLASS
// ============================================================================

export class TradeService {
  private priceService: PriceService;

  constructor(priceService: PriceService) {
    this.priceService = priceService;
  }

  /**
   * Execute a buy trade
   * 
   * Process:
   * 1. Validate user has sufficient balance
   * 2. Fetch current token price
   * 3. Calculate quantity based on SOL amount
   * 4. Create trade and update holdings atomically
   * 
   * @param userId - User ID executing the trade
   * @param request - Trade request details
   * @param broadcasts - Optional broadcast callbacks
   */
  async executeBuy(
    userId: string,
    request: TradeRequest,
    broadcasts?: BroadcastFunctions
  ): Promise<TradeResult> {
    try {
      logger.info(`Executing BUY trade for user ${userId}:`, request);

      // Fetch user and current price in parallel
      const [user, tokenPrice, tokenPriceSol] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        this.priceService.getPrice(request.tokenAddress),
        this.priceService.getPriceSol(request.tokenAddress), // Get SOL-native price
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      if (!tokenPrice || !tokenPriceSol) {
        throw new Error('Unable to fetch token price');
      }

      // Validate balance
      const amountSol = new Decimal(request.amountSol);
      if (user.virtualSolBalance.lt(amountSol)) {
        throw new Error('Insufficient SOL balance');
      }

      // Get SOL price for USD calculations (still needed for USD displays)
      const solPrice = await this.priceService.getSolPrice();

      // Calculate token quantity using SOL-native price
      // quantity = amountSol / tokenPriceSol
      const quantity = amountSol.div(tokenPriceSol);

      // Execute trade in atomic transaction
      const result = await this.executeTradeTransaction({
        userId,
        tokenAddress: request.tokenAddress,
        tokenSymbol: request.tokenSymbol,
        tokenName: request.tokenName,
        tokenImageUrl: request.tokenImageUrl,
        action: 'BUY',
        quantity: quantity.toString(),
        price: tokenPrice.price.toString(),
        marketCapUsd: tokenPrice.marketCap,
        pricePerTokenSol: tokenPriceSol, // Pass SOL price for transaction recording
      }, amountSol, solPrice);

      // Broadcast updates
      if (broadcasts?.broadcastBalanceUpdate) {
        broadcasts.broadcastBalanceUpdate(userId, result.updatedBalance.toNumber());
      }

      if (broadcasts?.broadcastTradeExecuted) {
        broadcasts.broadcastTradeExecuted(userId, {
          action: 'buy',
          token: request.tokenAddress,
          quantity: quantity.toString(),
          price: tokenPrice.price,
        });
      }

      logger.info(`BUY trade executed successfully for user ${userId}`);
      return result;
    } catch (error) {
      logger.error(`Error executing BUY trade for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a sell trade
   * 
   * Process:
   * 1. Validate user has sufficient holdings
   * 2. Fetch current token price
   * 3. Calculate quantity based on SOL amount
   * 4. Calculate realized PnL
   * 5. Create trade and update holdings atomically
   * 
   * @param userId - User ID executing the trade
   * @param request - Trade request details
   * @param broadcasts - Optional broadcast callbacks
   */
  async executeSell(
    userId: string,
    request: TradeRequest,
    broadcasts?: BroadcastFunctions
  ): Promise<TradeResult> {
    try {
      logger.info(`Executing SELL trade for user ${userId}:`, request);

      // Fetch holding and current price in parallel
      const [holding, tokenPrice, tokenPriceSol] = await Promise.all([
        prisma.holding.findUnique({
          where: {
            user_token_position: {
              userId,
              tokenAddress: request.tokenAddress,
            },
          },
        }),
        this.priceService.getPrice(request.tokenAddress),
        this.priceService.getPriceSol(request.tokenAddress), // Get SOL-native price
      ]);

      if (!holding || holding.quantity.lte(0)) {
        throw new Error('No holdings for this token');
      }

      if (!tokenPrice || !tokenPriceSol) {
        throw new Error('Unable to fetch token price');
      }

      // Get SOL price for calculations
      const solPrice = await this.priceService.getSolPrice();

      // Calculate token quantity to sell using SOL-native price
      const amountSol = new Decimal(request.amountSol);
      const quantity = amountSol.div(tokenPriceSol);

      // Validate sufficient holdings
      if (holding.quantity.lt(quantity)) {
        throw new Error(`Insufficient holdings. Have: ${holding.quantity}, Need: ${quantity}`);
      }

      // Calculate realized PnL
      const entryPriceSol = holding.entryPrice;
      const currentPriceSol = new Decimal(tokenPrice.price).div(solPrice);
      const realizedPnL = currentPriceSol.sub(entryPriceSol).mul(quantity);

      // Execute trade in atomic transaction
      const result = await this.executeTradeTransaction({
        userId,
        tokenAddress: request.tokenAddress,
        tokenSymbol: request.tokenSymbol || holding.tokenSymbol,
        tokenName: request.tokenName || holding.tokenName,
        tokenImageUrl: request.tokenImageUrl || holding.tokenImageUrl,
        action: 'SELL',
        quantity: quantity.toString(),
        price: tokenPrice.price.toString(),
        marketCapUsd: tokenPrice.marketCap,
        pricePerTokenSol: tokenPriceSol, // Pass SOL price for transaction recording
      }, amountSol, solPrice, realizedPnL);

      // Broadcast updates
      if (broadcasts?.broadcastBalanceUpdate) {
        broadcasts.broadcastBalanceUpdate(userId, result.updatedBalance.toNumber());
      }

      if (broadcasts?.broadcastTradeExecuted) {
        broadcasts.broadcastTradeExecuted(userId, {
          action: 'sell',
          token: request.tokenAddress,
          quantity: quantity.toString(),
          price: tokenPrice.price,
          pnl: realizedPnL.toString(),
        });
      }

      logger.info(`SELL trade executed successfully for user ${userId}`);
      return result;
    } catch (error) {
      logger.error(`Error executing SELL trade for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Execute trade in atomic transaction
   * Uses interactive transaction for dependent operations
   * 
   * @param tradeData - Internal trade request
   * @param totalCost - Total cost in SOL
   * @param solPrice - Current SOL price in USD
   * @param realizedPnL - Realized PnL for sells (optional)
   */
  private async executeTradeTransaction(
    tradeData: InternalTradeRequest,
    totalCost: Decimal,
    solPrice: number,
    realizedPnL?: Decimal
  ): Promise<TradeResult> {
    // Use interactive transaction with serializable isolation
    // Ensures no concurrent trades can cause inconsistencies
    return await prisma.$transaction(
      async (tx) => {
        // 1. Create trade record
        const trade = await tx.trade.create({
          data: {
            userId: tradeData.userId,
            tokenAddress: tradeData.tokenAddress,
            tokenSymbol: tradeData.tokenSymbol || null,
            tokenName: tradeData.tokenName || null,
            action: tradeData.action,
            quantity: new Decimal(tradeData.quantity),
            price: new Decimal(tradeData.price),
            totalCost: totalCost,
            realizedPnL: realizedPnL || null,
            marketCapUsd: tradeData.marketCapUsd ? new Decimal(tradeData.marketCapUsd) : null,
          },
        });

        // 1a. Record transaction for FIFO tracking (if SOL price available)
        if (tradeData.pricePerTokenSol) {
          try {
            if (tradeData.action === 'BUY') {
              await transactionService.recordBuyTransaction({
                userId: tradeData.userId,
                tokenAddress: tradeData.tokenAddress,
                tokenSymbol: tradeData.tokenSymbol,
                tokenName: tradeData.tokenName,
                action: 'BUY',
                quantity: tradeData.quantity,
                pricePerTokenSol: tradeData.pricePerTokenSol,
                totalCostSol: totalCost.toString(),
                tradeId: trade.id,
                executedAt: trade.timestamp,
              });
            } else {
              await transactionService.recordSellTransaction({
                userId: tradeData.userId,
                tokenAddress: tradeData.tokenAddress,
                tokenSymbol: tradeData.tokenSymbol,
                tokenName: tradeData.tokenName,
                action: 'SELL',
                quantity: tradeData.quantity,
                pricePerTokenSol: tradeData.pricePerTokenSol,
                totalCostSol: totalCost.toString(),
                tradeId: trade.id,
                executedAt: trade.timestamp,
              });
            }
          } catch (txError) {
            // Log but don't fail the trade if transaction recording fails
            logger.error('Failed to record transaction for FIFO:', txError);
          }
        }

        // 2. Update user balance
        const balanceChange = tradeData.action === 'BUY' 
          ? totalCost.neg() // Subtract for buy
          : totalCost; // Add for sell

        const updatedUser = await tx.user.update({
          where: { id: tradeData.userId },
          data: {
            virtualSolBalance: {
              increment: balanceChange,
            },
          },
        });

        // 3. Update or create holding
        let updatedHolding: Holding;

        if (tradeData.action === 'BUY') {
          // Upsert holding with weighted average entry price
          const existing = await tx.holding.findUnique({
            where: {
              user_token_position: {
                userId: tradeData.userId,
                tokenAddress: tradeData.tokenAddress,
              },
            },
          });

          const newQuantity = new Decimal(tradeData.quantity);
          const newEntryPrice = totalCost.div(newQuantity); // Entry price in SOL per token

          if (existing) {
            // Calculate weighted average entry price
            const existingValue = existing.quantity.mul(existing.entryPrice);
            const newValue = newQuantity.mul(newEntryPrice);
            const totalQuantity = existing.quantity.add(newQuantity);
            const avgEntryPrice = existingValue.add(newValue).div(totalQuantity);

            // Calculate weighted average market cap
            let avgMarketCap = existing.avgBuyMarketCap;
            if (tradeData.marketCapUsd && existing.avgBuyMarketCap) {
              const existingMcValue = existing.quantity.mul(existing.avgBuyMarketCap);
              const newMcValue = newQuantity.mul(tradeData.marketCapUsd);
              avgMarketCap = existingMcValue.add(newMcValue).div(totalQuantity);
            } else if (tradeData.marketCapUsd) {
              avgMarketCap = new Decimal(tradeData.marketCapUsd);
            }

            updatedHolding = await tx.holding.update({
              where: {
                user_token_position: {
                  userId: tradeData.userId,
                  tokenAddress: tradeData.tokenAddress,
                },
              },
              data: {
                quantity: totalQuantity,
                entryPrice: avgEntryPrice,
                avgBuyMarketCap: avgMarketCap,
                tokenSymbol: tradeData.tokenSymbol || existing.tokenSymbol,
                tokenName: tradeData.tokenName || existing.tokenName,
              },
            });
          } else {
            // Create new holding
            updatedHolding = await tx.holding.create({
              data: {
                userId: tradeData.userId,
                tokenAddress: tradeData.tokenAddress,
                tokenSymbol: tradeData.tokenSymbol || null,
                tokenName: tradeData.tokenName || null,
                quantity: newQuantity,
                entryPrice: newEntryPrice,
                avgBuyMarketCap: tradeData.marketCapUsd ? new Decimal(tradeData.marketCapUsd) : null,
              },
            });
          }
        } else {
          // SELL: Reduce quantity
          const sellQuantity = new Decimal(tradeData.quantity);

          updatedHolding = await tx.holding.update({
            where: {
              user_token_position: {
                userId: tradeData.userId,
                tokenAddress: tradeData.tokenAddress,
              },
            },
            data: {
              quantity: {
                decrement: sellQuantity,
              },
            },
          });

          // Delete holding if quantity reaches zero
          if (updatedHolding.quantity.lte(0)) {
            await tx.holding.delete({
              where: {
                user_token_position: {
                  userId: tradeData.userId,
                  tokenAddress: tradeData.tokenAddress,
                },
              },
            });
          }
        }

        return {
          trade,
          updatedBalance: updatedUser.virtualSolBalance,
          updatedHolding,
          realizedPnL,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000, // 5 seconds max wait
        timeout: 10000, // 10 seconds timeout
      }
    );
  }

  /**
   * Get trade history for a user
   * 
   * @param userId - User ID
   * @param limit - Max trades to return
   * @param offset - Pagination offset
   */
  async getTradeHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Trade[]> {
    try {
      // Uses composite index: @@index([userId, timestamp])
      return await prisma.trade.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      logger.error(`Error fetching trade history for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Serialize trade result for JSON response
   */
  serializeTradeResult(result: TradeResult): SerializedTradeResult {
    return {
      trade: {
        ...result.trade,
        quantity: result.trade.quantity.toString(),
        price: result.trade.price.toString(),
        totalCost: result.trade.totalCost.toString(),
        realizedPnL: result.trade.realizedPnL?.toString() || null,
        marketCapUsd: result.trade.marketCapUsd?.toString() || null,
      },
      updatedBalance: result.updatedBalance.toString(),
      updatedHolding: result.updatedHolding ? {
        ...result.updatedHolding,
        quantity: result.updatedHolding.quantity.toString(),
        entryPrice: result.updatedHolding.entryPrice.toString(),
        avgBuyMarketCap: result.updatedHolding.avgBuyMarketCap?.toString() || null,
      } : undefined,
      realizedPnL: result.realizedPnL?.toString(),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

import { priceService } from './priceService.js';
export const tradeService = new TradeService(priceService);
