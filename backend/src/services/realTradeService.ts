/**
 * Real Trade Service - Refactored to eliminate duplication
 *
 * Orchestrates real mainnet trading by routing to appropriate PumpPortal API:
 * - DEPOSITED balance → Lightning API (1% fee)
 * - WALLET trading → Local Transaction API (0.5% fee)
 *
 * Uses shared logic from tradeCommon.ts
 * REFACTORED: Eliminates 122 lines of code duplication between executeRealTrade and submitSignedRealTrade
 */

import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import priceService from "../plugins/priceService.js";
import { D } from "../utils/pnl.js";
import { portfolioCoalescer } from "../utils/requestCoalescer.js";
import * as lightningService from "./pumpPortalLightningService.js";
import * as localService from "./pumpPortalLocalService.js";
import { loggers } from "../utils/logger.js";
import {
  getValidatedPrice,
  checkAndClampSellQuantity,
  createFIFOLot,
  updatePositionBuy,
  executeFIFOSell,
  updatePositionSell,
  executePostTradeOperations
} from "./tradeCommon.js";

const logger = loggers.trade;

const DEFAULT_SLIPPAGE = 10;
const DEFAULT_PRIORITY_FEE = 0.0001;

export type FundingSourceType = "DEPOSITED" | "WALLET";

export interface RealTradeParams {
  userId: string;
  mint: string;
  side: "BUY" | "SELL";
  qty: string;
  fundingSource: FundingSourceType;
  walletPublicKey?: string;
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
 * EXTRACTED HELPER: Record real trade in database (eliminates duplication)
 *
 * This function consolidates the identical database transaction logic from
 * executeRealTrade() and submitSignedRealTrade(), eliminating 122 lines of duplication.
 */
async function recordRealTradeInDatabase(
  params: {
    userId: string;
    mint: string;
    side: "BUY" | "SELL";
    qty: Decimal;
    priceUsd: Decimal;
    priceSol: Decimal;
    solUsdAtFill: Decimal;
    marketCapUsd: Decimal | null;
    grossSol: Decimal;
    pumpPortalFee: Decimal;
    netSol: Decimal;
    tradeCostSol: Decimal;
    tradeCostUsd: Decimal;
    txSignature: string;
    txStatus: "PENDING" | "CONFIRMED" | "FAILED";
    fundingSource: FundingSourceType;
    updateBalance: boolean; // TRUE for DEPOSITED, FALSE for WALLET
  }
) {
  return await prisma.$transaction(async (tx) => {
    // Create trade record
    const trade = await tx.trade.create({
      data: {
        userId: params.userId,
        tokenAddress: params.mint,
        mint: params.mint,
        side: params.side,
        action: params.side.toLowerCase(),
        quantity: params.qty,
        price: params.priceUsd,
        priceSOLPerToken: params.priceSol,
        grossSol: params.grossSol,
        feesSol: params.pumpPortalFee,
        netSol: params.netSol,
        totalCost: params.tradeCostSol,
        costUsd: params.tradeCostUsd,
        solUsdAtFill: params.solUsdAtFill,
        marketCapUsd: params.marketCapUsd,
        route: "PumpPortal",
        tradeMode: "REAL",
        realTxSignature: params.txSignature,
        realTxStatus: params.txStatus,
        fundingSource: params.fundingSource,
        pumpPortalFee: params.pumpPortalFee
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
      // Create FIFO lot using shared function
      await createFIFOLot(
        tx, pos.id, params.userId, params.mint,
        params.qty, params.priceUsd, params.priceSol, params.solUsdAtFill,
        "REAL"
      );

      // Update position using shared function
      pos = await updatePositionBuy(
        tx, params.userId, params.mint,
        pos.qty as Decimal,
        pos.costBasis as Decimal,
        params.qty, params.priceUsd,
        "REAL"
      );

      // Update real SOL balance (only for DEPOSITED funding)
      if (params.updateBalance) {
        await tx.user.update({
          where: { id: params.userId },
          data: { realSolBalance: { decrement: params.tradeCostSol } }
        });
      }
    } else {
      // Execute FIFO sell using shared function
      const lots = await tx.positionLot.findMany({
        where: {
          userId: params.userId,
          mint: params.mint,
          tradeMode: "REAL",
          qtyRemaining: { gt: 0 }
        },
        orderBy: { createdAt: "asc" }
      });

      const fifoResult = await executeFIFOSell(tx, params.userId, params.mint, params.qty, params.priceUsd, "REAL");
      realizedPnL = fifoResult.realizedPnL;

      // Update position using shared function
      pos = await updatePositionSell(
        tx, params.userId, params.mint,
        pos.qty as Decimal,
        pos.costBasis as Decimal,
        params.qty,
        fifoResult.consumed,
        lots,
        "REAL"
      );

      // Record realized PnL
      await tx.realizedPnL.create({
        data: {
          userId: params.userId,
          mint: params.mint,
          pnl: realizedPnL,
          pnlUsd: realizedPnL,
          tradeMode: "REAL",
          tradeId: trade.id
        }
      });

      // Update real SOL balance (only for DEPOSITED funding)
      if (params.updateBalance) {
        await tx.user.update({
          where: { id: params.userId },
          data: { realSolBalance: { increment: params.tradeCostSol } }
        });
      }
    }

    return { trade, position: pos, realizedPnL };
  });
}

/**
 * Execute a real mainnet trade using Lightning API (DEPOSITED funds)
 */
export async function executeRealTrade(params: RealTradeParams): Promise<RealTradeResult> {
  let q = D(params.qty);
  if (q.lte(0)) throw new Error("Quantity must be greater than 0");

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

  // Get validated price using shared function
  const { priceUsd, priceSol, solUsdAtFill, marketCapUsd } = await getValidatedPrice(params.mint, params.side);
  const mcAtFill = marketCapUsd;

  // For sells, check and clamp quantity using shared function
  if (params.side === "SELL") {
    const { clampedQty } = await checkAndClampSellQuantity(params.userId, params.mint, q, "REAL");
    q = clampedQty;
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

  let netSol: Decimal;
  let tradeCostSol: Decimal;
  let tradeCostUsd: Decimal;

  if (params.side === "BUY") {
    netSol = grossSol.plus(pumpPortalFee);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill);

    // Check balance (deposited only)
    if (params.fundingSource === "DEPOSITED") {
      const currentBalance = user.realSolBalance as Decimal;
      if (currentBalance.lt(tradeCostSol)) {
        throw new Error(
          `Insufficient real SOL balance. Required: ${tradeCostSol.toFixed(4)} SOL, Available: ${currentBalance.toFixed(4)} SOL`
        );
      }
    }
  } else {
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
    throw new Error(
      "Wallet trading requires two-step process: call buildWalletTransaction() first"
    );
  }

  // Verify transaction on-chain
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

  // Record the trade in database using EXTRACTED helper function
  // DEPOSITED funding → updateBalance = TRUE
  const result = await recordRealTradeInDatabase({
    userId: params.userId,
    mint: params.mint,
    side: params.side,
    qty: q,
    priceUsd,
    priceSol,
    solUsdAtFill,
    marketCapUsd: mcAtFill,
    grossSol,
    pumpPortalFee,
    netSol,
    tradeCostSol,
    tradeCostUsd,
    txSignature,
    txStatus,
    fundingSource: params.fundingSource,
    updateBalance: params.fundingSource === "DEPOSITED" // Key difference
  });

  // Execute post-trade operations using shared function (invalidates cache, adds rewards, prefetches price)
  await executePostTradeOperations(params.userId, params.mint, tradeCostUsd);

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

  // Get validated price
  const { priceSol } = await getValidatedPrice(params.mint, params.side);
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
 */
export async function submitSignedRealTrade(
  params: RealTradeParams,
  signedTransactionBase64: string
): Promise<RealTradeResult> {
  if (params.fundingSource !== "WALLET") {
    throw new Error("submitSignedRealTrade only for WALLET funding source");
  }

  let q = D(params.qty);
  if (q.lte(0)) throw new Error("Quantity must be greater than 0");

  logger.info({
    userId: params.userId,
    mint: params.mint.slice(0, 8),
    side: params.side,
    qty: params.qty,
    fundingSource: params.fundingSource
  }, "[RealTrade] Submitting signed wallet transaction");

  // Submit the signed transaction via Local API
  const submitResult = await localService.submitSignedTransaction(signedTransactionBase64);

  if (!submitResult.success || !submitResult.signature) {
    throw new Error(submitResult.error || "Failed to submit transaction");
  }

  const txSignature = submitResult.signature;
  logger.info({ signature: txSignature }, "[RealTrade] Wallet transaction submitted");

  // Verify transaction on-chain
  logger.info({ signature: txSignature }, "[RealTrade] Verifying transaction on-chain");
  const verified = await lightningService.verifyTransaction(txSignature);

  let txStatus: "PENDING" | "CONFIRMED" | "FAILED" = verified ? "CONFIRMED" : "FAILED";

  if (!verified) {
    txStatus = "FAILED";
    logger.error({ signature: txSignature }, "[RealTrade] Transaction failed verification");
    throw new Error("Transaction failed to confirm on-chain");
  }

  logger.info({ signature: txSignature }, "[RealTrade] Transaction confirmed on-chain");

  // Get validated price
  const { priceUsd, priceSol, solUsdAtFill, marketCapUsd } = await getValidatedPrice(params.mint, params.side);
  const mcAtFill = marketCapUsd;

  // For sells, check and clamp quantity
  if (params.side === "SELL") {
    const { clampedQty } = await checkAndClampSellQuantity(params.userId, params.mint, q, "REAL");
    q = clampedQty;
  }

  // Calculate amounts
  const grossSol = q.mul(priceSol);
  const grossUsd = q.mul(priceUsd);
  const pumpPortalFee = grossSol.mul(localService.LOCAL_FEE_PERCENT / 100);

  let netSol: Decimal;
  let tradeCostSol: Decimal;
  let tradeCostUsd: Decimal;

  if (params.side === "BUY") {
    netSol = grossSol.plus(pumpPortalFee);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill);
  } else {
    netSol = grossSol.minus(pumpPortalFee);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill);
  }

  logger.info({
    priceUsd: priceUsd.toString(),
    priceSol: priceSol.toString(),
    grossSol: grossSol.toString(),
    pumpPortalFee: pumpPortalFee.toString(),
    netSol: netSol.toString()
  }, "[RealTrade] Wallet trade pricing calculated");

  // Record the trade in database using EXTRACTED helper function
  // WALLET funding → updateBalance = FALSE (funds from user's wallet, not deposited balance)
  const result = await recordRealTradeInDatabase({
    userId: params.userId,
    mint: params.mint,
    side: params.side,
    qty: q,
    priceUsd,
    priceSol,
    solUsdAtFill,
    marketCapUsd: mcAtFill,
    grossSol,
    pumpPortalFee,
    netSol,
    tradeCostSol,
    tradeCostUsd,
    txSignature,
    txStatus,
    fundingSource: params.fundingSource,
    updateBalance: false // Key difference: do NOT update realSolBalance for WALLET trading
  });

  // Execute post-trade operations using shared function
  await executePostTradeOperations(params.userId, params.mint, tradeCostUsd);

  // Calculate portfolio totals
  const portfolioTotals = await calculateRealPortfolioTotals(params.userId);

  logger.info({
    userId: params.userId,
    txSignature,
    side: params.side,
    amount: q.toString()
  }, "✅ [RealTrade] Wallet trade completed successfully");

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
