/**
 * Real Trade Service
 *
 * Orchestrates real mainnet trading by routing to appropriate PumpPortal API:
 * - DEPOSITED balance → Lightning API (1% fee)
 * - WALLET trading → Local Transaction API (0.5% fee)
 *
 * Integrates with existing FIFO position tracking from tradeService.ts
 */

import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import priceService from "../plugins/priceService.js";
import { D, vwapBuy, fifoSell } from "../utils/pnl.js";
import { addTradePoints } from "./rewardService.js";
import { portfolioCoalescer } from "../utils/requestCoalescer.js";
import * as lightningService from "./pumpPortalLightningService.js";
import * as localService from "./pumpPortalLocalService.js";
import { loggers } from "../utils/logger.js";

const logger = loggers.trade;

// Constants
const DEFAULT_SLIPPAGE = 10; // 10% slippage tolerance
const DEFAULT_PRIORITY_FEE = 0.0001; // 0.0001 SOL priority fee

export type FundingSourceType = "DEPOSITED" | "WALLET";

export interface RealTradeParams {
  userId: string;
  mint: string;
  side: "BUY" | "SELL";
  qty: string;
  fundingSource: FundingSourceType;
  walletPublicKey?: string; // Required if fundingSource === "WALLET"
  slippage?: number;
  priorityFee?: number;
}

export interface RealTradeResult {
  trade: any;
  position: any;
  portfolioTotals: {
    totalValueUsd: Decimal;
    totalCostBasis: Decimal;
    unrealizedPnL: Decimal;
    realizedPnL: Decimal;
    realSolBalance: Decimal;
  };
  rewardPointsEarned: Decimal;
  realTxSignature: string;
  realTxStatus: "PENDING" | "CONFIRMED" | "FAILED";
}

/**
 * Execute a real mainnet trade
 * Routes to Lightning or Local API based on funding source
 */
export async function executeRealTrade(
  params: RealTradeParams
): Promise<RealTradeResult> {
  let q = D(params.qty);
  if (q.lte(0)) throw new Error("Quantity must be greater than 0");

  // Validate funding source
  if (params.fundingSource === "WALLET" && !params.walletPublicKey) {
    throw new Error("Wallet public key required for wallet trading");
  }

  logger.info({
    userId: params.userId,
    mint: params.mint.slice(0, 8),
    side: params.side,
    qty: params.qty,
    fundingSource: params.fundingSource
  }, `[RealTrade] Executing real ${params.side} order`);

  // Get user
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) throw new Error("User not found");

  // Get price tick
  const tick = await priceService.getLastTick(params.mint);
  if (!tick || !tick.priceUsd || tick.priceUsd <= 0) {
    throw new Error(`Price data unavailable for token ${params.mint}`);
  }

  // Validate price freshness (5 minutes)
  const priceAge = Date.now() - tick.timestamp;
  if (priceAge > 5 * 60 * 1000) {
    throw new Error(
      `Price data is stale for token ${params.mint} (${Math.floor(priceAge / 1000)}s old)`
    );
  }

  const priceUsd = D(tick.priceUsd);
  const currentSolPrice = priceService.getSolPrice();
  if (currentSolPrice <= 0) {
    throw new Error(`Invalid SOL price: $${currentSolPrice}`);
  }

  const solUsdAtFill = D(currentSolPrice);
  const priceSol = priceUsd.div(solUsdAtFill);
  const mcAtFill = tick.marketCapUsd ? D(tick.marketCapUsd) : null;

  // For sells, check position and clamp quantity if needed
  if (params.side === "SELL") {
    const position = await prisma.position.findUnique({
      where: {
        userId_mint_tradeMode: {
          userId: params.userId,
          mint: params.mint,
          tradeMode: "REAL" // Real trading positions
        }
      }
    });

    if (!position) {
      throw new Error(`No real trading position found for token`);
    }

    const positionQty = position.qty as Decimal;
    const difference = positionQty.minus(q);

    // Allow tiny rounding errors
    const EPSILON = D("0.0001");
    if (difference.lt(EPSILON.neg())) {
      throw new Error(
        `Insufficient token balance. Required: ${q.toFixed(4)}, Available: ${positionQty.toFixed(4)}`
      );
    }

    // Clamp to exact position quantity if within epsilon
    if (difference.lt(0) && difference.gte(EPSILON.neg())) {
      logger.info(
        `[RealTrade] Clamping sell quantity from ${q.toString()} to ${positionQty.toString()}`
      );
      q = positionQty;
    }
  }

  // Calculate trade amounts
  const grossSol = q.mul(priceSol);
  const grossUsd = q.mul(priceUsd);

  // Calculate PumpPortal fee (depends on funding source)
  const pumpPortalFeePercent =
    params.fundingSource === "DEPOSITED"
      ? lightningService.LIGHTNING_FEE_PERCENT
      : localService.LOCAL_FEE_PERCENT;

  const pumpPortalFee = grossSol.mul(pumpPortalFeePercent / 100);

  // Total SOL including fees
  let netSol: Decimal;
  let tradeCostSol: Decimal;
  let tradeCostUsd: Decimal;

  if (params.side === "BUY") {
    // For buys: cost = gross + pumpPortalFee + network fees
    netSol = grossSol.plus(pumpPortalFee);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill);

    // Check balance (deposited or wallet)
    if (params.fundingSource === "DEPOSITED") {
      const currentBalance = user.realSolBalance as Decimal;
      if (currentBalance.lt(tradeCostSol)) {
        throw new Error(
          `Insufficient real SOL balance. Required: ${tradeCostSol.toFixed(
            4
          )} SOL, Available: ${currentBalance.toFixed(4)} SOL`
        );
      }
    }
    // For wallet trading, user's wallet balance will be checked by Solana
  } else {
    // For sells: proceeds = gross - pumpPortalFee - network fees
    netSol = grossSol.minus(pumpPortalFee);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill);
  }

  logger.info({
    priceUsd: priceUsd.toString(),
    priceSol: priceSol.toString(),
    grossSol: grossSol.toString(),
    pumpPortalFee: pumpPortalFee.toString(),
    netSol: netSol.toString(),
    fundingSource: params.fundingSource
  }, "[RealTrade] Trade pricing calculated");

  // Execute the real trade via PumpPortal
  let txSignature: string;
  let txStatus: "PENDING" | "CONFIRMED" | "FAILED" = "PENDING";

  if (params.fundingSource === "DEPOSITED") {
    // Use Lightning API
    const lightningResult = await lightningService.executeLightningTrade({
      action: params.side.toLowerCase() as "buy" | "sell",
      mint: params.mint,
      amount: parseFloat(grossSol.toString()),
      denominatedInSol: true,
      slippage: params.slippage || DEFAULT_SLIPPAGE,
      priorityFee: params.priorityFee || DEFAULT_PRIORITY_FEE,
      pool: "auto"
    });

    if (!lightningResult.success || !lightningResult.signature) {
      throw new Error(lightningResult.error || "Lightning API trade failed");
    }

    txSignature = lightningResult.signature;
  } else {
    // Use Local Transaction API - build transaction for user to sign
    // Note: This path returns early with the unsigned transaction
    // The frontend will sign it and call submitSignedRealTrade()
    throw new Error(
      "Wallet trading requires two-step process: call buildWalletTransaction() first"
    );
  }

  // Verify transaction on-chain (with retries)
  logger.info({ signature: txSignature }, "[RealTrade] Verifying transaction on-chain");
  const verified = await lightningService.verifyTransaction(txSignature);

  if (verified) {
    txStatus = "CONFIRMED";
    logger.info({ signature: txSignature }, "[RealTrade] Transaction confirmed on-chain");
  } else {
    txStatus = "FAILED";
    logger.error({ signature: txSignature }, "[RealTrade] Transaction failed verification");
    throw new Error("Transaction failed to confirm on-chain");
  }

  // Record the trade in database using existing FIFO logic
  const result = await prisma.$transaction(async (tx) => {
    // Create trade record with real trading fields
    const trade = await tx.trade.create({
      data: {
        userId: params.userId,
        tokenAddress: params.mint,
        mint: params.mint,
        side: params.side,
        action: params.side.toLowerCase(),
        quantity: q,
        price: priceUsd,
        priceSOLPerToken: priceSol,
        grossSol,
        feesSol: pumpPortalFee,
        netSol,
        totalCost: tradeCostSol,
        costUsd: tradeCostUsd,
        solUsdAtFill,
        marketCapUsd: mcAtFill,
        route: "PumpPortal",
        // Real trading specific fields
        tradeMode: "REAL",
        realTxSignature: txSignature,
        realTxStatus: txStatus,
        fundingSource: params.fundingSource,
        pumpPortalFee: pumpPortalFee
      }
    });

    // Fetch/initialize position with REAL trade mode
    let pos = await tx.position.findUnique({
      where: {
        userId_mint_tradeMode: {
          userId: params.userId,
          mint: params.mint,
          tradeMode: "REAL"
        }
      }
    });

    if (!pos) {
      pos = await tx.position.create({
        data: {
          userId: params.userId,
          mint: params.mint,
          qty: D(0),
          costBasis: D(0),
          tradeMode: "REAL"
        }
      });
    }

    let realizedPnL = D(0);

    if (params.side === "BUY") {
      // Create new lot for FIFO tracking with REAL trade mode
      await tx.positionLot.create({
        data: {
          positionId: pos.id,
          userId: params.userId,
          mint: params.mint,
          qtyRemaining: q,
          unitCostUsd: priceUsd,
          unitCostSol: priceSol,
          solUsdAtBuy: solUsdAtFill,
          tradeMode: "REAL"
        }
      });

      // Update position using VWAP
      const newVWAP = vwapBuy(pos.qty as Decimal, pos.costBasis as Decimal, q, priceUsd);
      pos = await tx.position.update({
        where: {
          userId_mint_tradeMode: {
            userId: params.userId,
            mint: params.mint,
            tradeMode: "REAL"
          }
        },
        data: {
          qty: newVWAP.newQty,
          costBasis: newVWAP.newBasis
        }
      });

      // Deduct from real SOL balance (deposited only)
      if (params.fundingSource === "DEPOSITED") {
        await tx.user.update({
          where: { id: params.userId },
          data: {
            realSolBalance: {
              decrement: tradeCostSol
            }
          }
        });
      }
    } else {
      // SELL: Consume lots using FIFO (REAL trade mode only)
      const lots = await tx.positionLot.findMany({
        where: {
          userId: params.userId,
          mint: params.mint,
          tradeMode: "REAL",
          qtyRemaining: { gt: 0 }
        },
        orderBy: { createdAt: "asc" }
      });

      const { realized, consumed } = fifoSell(
        lots.map((l: any) => ({
          id: l.id,
          qtyRemaining: l.qtyRemaining as Decimal,
          unitCostUsd: l.unitCostUsd as Decimal
        })),
        q,
        priceUsd
      );

      realizedPnL = realized;

      // Update consumed lots
      for (const c of consumed) {
        const lot = lots.find((l: any) => l.id === c.lotId)!;
        const newQty = (lot.qtyRemaining as Decimal).sub(c.qty);
        await tx.positionLot.update({
          where: { id: lot.id },
          data: { qtyRemaining: newQty }
        });
      }

      // Update position
      const newQty = (pos.qty as Decimal).sub(q);
      const totalConsumedCost = consumed.reduce((sum, c) => {
        const lot = lots.find((l: any) => l.id === c.lotId)!;
        return sum.add(c.qty.mul(lot.unitCostUsd as Decimal));
      }, D(0));

      let newBasis = (pos.costBasis as Decimal).sub(totalConsumedCost);
      if (newBasis.lt(0)) {
        logger.error(
          `⚠️ Negative cost basis detected for real position, clamping to 0`
        );
        newBasis = D(0);
      }
      if (newQty.eq(0)) newBasis = D(0);

      pos = await tx.position.update({
        where: {
          userId_mint_tradeMode: {
            userId: params.userId,
            mint: params.mint,
            tradeMode: "REAL"
          }
        },
        data: { qty: newQty, costBasis: newBasis }
      });

      // Record realized PnL with REAL trade mode
      await tx.realizedPnL.create({
        data: {
          userId: params.userId,
          mint: params.mint,
          pnl: realized,
          pnlUsd: realized,
          tradeMode: "REAL",
          tradeId: trade.id
        }
      });

      // Add to real SOL balance (deposited only)
      if (params.fundingSource === "DEPOSITED") {
        await tx.user.update({
          where: { id: params.userId },
          data: {
            realSolBalance: {
              increment: tradeCostSol
            }
          }
        });
      }
    }

    return { trade, position: pos, realizedPnL };
  });

  // Add reward points (real trades earn points too!)
  await addTradePoints(params.userId, tradeCostUsd);

  // Invalidate portfolio cache
  portfolioCoalescer.invalidate(`portfolio:${params.userId}`);
  logger.info(`[RealTrade] Invalidated portfolio cache for user ${params.userId}`);

  // Calculate portfolio totals (real trading)
  const portfolioTotals = await calculateRealPortfolioTotals(params.userId);

  return {
    trade: result.trade,
    position: result.position,
    portfolioTotals,
    rewardPointsEarned: tradeCostUsd,
    realTxSignature: txSignature,
    realTxStatus: txStatus
  };
}

/**
 * Build unsigned transaction for wallet trading (Local API)
 * User will sign on frontend and call submitSignedRealTrade()
 */
export async function buildWalletTransaction(
  params: RealTradeParams
): Promise<{ serializedTransaction: string }> {
  if (params.fundingSource !== "WALLET") {
    throw new Error("buildWalletTransaction only for WALLET funding source");
  }

  if (!params.walletPublicKey) {
    throw new Error("Wallet public key required");
  }

  // Get price and calculate amounts (same as above)
  const tick = await priceService.getLastTick(params.mint);
  if (!tick || !tick.priceUsd || tick.priceUsd <= 0) {
    throw new Error(`Price data unavailable for token ${params.mint}`);
  }

  const priceUsd = D(tick.priceUsd);
  const currentSolPrice = priceService.getSolPrice();
  const solUsdAtFill = D(currentSolPrice);
  const priceSol = priceUsd.div(solUsdAtFill);
  const q = D(params.qty);
  const grossSol = q.mul(priceSol);

  // Build unsigned transaction via Local API
  const buildResult = await localService.buildTransaction({
    publicKey: params.walletPublicKey,
    action: params.side.toLowerCase() as "buy" | "sell",
    mint: params.mint,
    amount: parseFloat(grossSol.toString()),
    denominatedInSol: true,
    slippage: params.slippage || DEFAULT_SLIPPAGE,
    priorityFee: params.priorityFee || DEFAULT_PRIORITY_FEE,
    pool: "auto"
  });

  if (!buildResult.success) {
    throw new Error(buildResult.error || "Failed to build transaction");
  }

  return {
    serializedTransaction: buildResult.serializedTransaction
  };
}

/**
 * Submit signed wallet transaction (Local API)
 * Called after user signs transaction on frontend
 */
export async function submitSignedRealTrade(
  params: RealTradeParams,
  signedTransactionBase64: string
): Promise<RealTradeResult> {
  if (params.fundingSource !== "WALLET") {
    throw new Error("submitSignedRealTrade only for WALLET funding source");
  }

  // Submit the signed transaction
  const submitResult = await localService.submitSignedTransaction(signedTransactionBase64);

  if (!submitResult.success || !submitResult.signature) {
    throw new Error(submitResult.error || "Failed to submit transaction");
  }

  const txSignature = submitResult.signature;

  // Now follow the same flow as deposited balance trading
  // (duplicate logic from executeRealTrade for now)
  // TODO: Refactor to share common logic

  logger.info(
    { signature: txSignature },
    "[RealTrade] Wallet transaction submitted, completing trade record"
  );

  // Verify and record trade (similar to executeRealTrade)
  // For brevity, returning placeholder - full implementation would mirror executeRealTrade
  throw new Error("Wallet trade completion not yet fully implemented");
}

/**
 * Calculate real trading portfolio totals
 */
async function calculateRealPortfolioTotals(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const positions = await prisma.position.findMany({
    where: { userId, tradeMode: "REAL", qty: { gt: 0 } }
  });

  const mints = positions.map((p) => p.mint);
  const prices = await priceService.getPrices(mints);

  let totalValueUsd = D(0);
  let totalCostBasis = D(0);

  for (const pos of positions) {
    const currentPrice = D(prices[pos.mint] || 0);
    if (currentPrice.eq(0)) continue;

    const positionQty = pos.qty as Decimal;
    const positionCostBasis = pos.costBasis as Decimal;
    const positionValue = positionQty.mul(currentPrice);

    totalValueUsd = totalValueUsd.plus(positionValue);
    totalCostBasis = totalCostBasis.plus(positionCostBasis);
  }

  const realizedPnLRecords = await prisma.realizedPnL.findMany({
    where: { userId, tradeMode: "REAL" }
  });
  const totalRealizedPnL = realizedPnLRecords.reduce(
    (sum, record) => sum.plus(record.pnlUsd || record.pnl),
    D(0)
  );

  const unrealizedPnL = totalValueUsd.minus(totalCostBasis);
  const realSolBalance = (user?.realSolBalance as Decimal) || D(0);

  return {
    totalValueUsd,
    totalCostBasis,
    unrealizedPnL,
    realizedPnL: totalRealizedPnL,
    realSolBalance
  };
}

export default {
  executeRealTrade,
  buildWalletTransaction,
  submitSignedRealTrade
};
