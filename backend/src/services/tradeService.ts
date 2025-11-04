// Enhanced Trade service with comprehensive portfolio updates
// Refactored to use shared logic from tradeCommon.ts
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import priceService from "../plugins/priceService-optimized.js";
import { D } from "../utils/pnl.js";
import { simulateFees } from "../utils/decimal-helpers.js";
import * as notificationService from "./notificationService.js";
import redlock from "../plugins/redlock.js";
import { realtimePnLService } from "./realtimePnLService.js";
import redis from "../plugins/redis.js";
import { recordCreatorFees } from "./pumpfunRewardCollector.js";
import {
  getValidatedPrice,
  checkAndClampSellQuantity,
  createFIFOLot,
  updatePositionBuy,
  executeFIFOSell,
  updatePositionSell,
  executePostTradeOperations,
  mcVwapUpdate
} from "./tradeCommon.js";

// Enhanced trade interface with portfolio totals
interface TradeResult {
  trade: any;
  position: any;
  portfolioTotals: {
    totalValueUsd: Decimal;
    totalCostBasis: Decimal;
    unrealizedPnL: Decimal;
    realizedPnL: Decimal;
    solBalance: Decimal;
  };
  rewardPointsEarned: Decimal;
}

export async function fillTrade({
  userId,
  mint,
  side,
  qty
}: {
  userId: string;
  mint: string;
  side: "BUY" | "SELL";
  qty: string;
}): Promise<TradeResult> {
  let q = D(qty);
  if (q.lte(0)) throw new Error("Quantity must be greater than 0");

  console.log(`[Trade] ${side} order: userId=${userId}, mint=${mint.substring(0, 8)}..., qty=${qty}`);

  // Acquire distributed lock to prevent race conditions
  const lockKey = `trade:${userId}:${mint}`;
  const lockTTL = 5000;

  let lock;
  try {
    lock = await redlock.acquire([lockKey], lockTTL);
    console.log(`[Trade] Lock acquired for ${lockKey}`);
  } catch (error) {
    console.error(`[Trade] Failed to acquire lock for ${lockKey}:`, error);
    throw new Error("Trade is already in progress for this token. Please wait and try again.");
  }

  try {
    return await executeTradeLogic({ userId, mint, side, qty: q });
  } finally {
    try {
      await lock.release();
      console.log(`[Trade] Lock released for ${lockKey}`);
    } catch (error) {
      console.error(`[Trade] Failed to release lock for ${lockKey}:`, error);
    }
  }
}

async function executeTradeLogic({
  userId,
  mint,
  side,
  qty: q
}: {
  userId: string;
  mint: string;
  side: "BUY" | "SELL";
  qty: Decimal;
}): Promise<TradeResult> {

  // Get user to check SOL balance
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // CRITICAL FIX: Subscribe to PumpPortal BEFORE fetching price
  // This ensures we can receive real-time swap events even during initial price fetch
  // Without this, first-time trades have no PumpPortal data and fall back to bonding curve
  priceService.subscribeToPumpPortalToken(mint);
  console.log(`[Trade] Pre-subscribed to PumpPortal for ${mint.substring(0, 8)}... before price fetch`);

  // Get validated price data using shared function
  const { priceUsd, priceSol, solUsdAtFill, marketCapUsd } = await getValidatedPrice(mint, side);
  const mcAtFill = marketCapUsd;

  // For sells, check and clamp quantity using shared function
  if (side === "SELL") {
    const { clampedQty } = await checkAndClampSellQuantity(userId, mint, q, 'PAPER');
    q = clampedQty;
  }

  // Calculate gross trade amounts
  const grossSol = q.mul(priceSol);
  const grossUsd = q.mul(priceUsd);

  // Calculate fees (DEX + L1 + priority tip)
  const fees = simulateFees(grossSol);
  const totalFees = fees.dexFee.plus(fees.l1Fee).plus(fees.tipFee);

  // Calculate net amounts
  let netSol: Decimal;
  let tradeCostSol: Decimal;
  let tradeCostUsd: Decimal;

  if (side === "BUY") {
    netSol = grossSol.plus(totalFees);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill);

    // Check SOL balance
    const currentBalance = user.virtualSolBalance as Decimal;
    if (currentBalance.lt(tradeCostSol)) {
      throw new Error(`Insufficient SOL balance. Required: ${tradeCostSol.toFixed(4)} SOL, Available: ${currentBalance.toFixed(4)} SOL`);
    }
  } else {
    netSol = grossSol.minus(totalFees);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill);
  }

  console.log(`[Trade] Price: USD=${priceUsd.toString()}, SOL=${priceSol.toString()}`);
  console.log(`[Trade] Cost: SOL=${tradeCostSol.toString()}, USD=${tradeCostUsd.toString()}`);

  // Execute trade in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create trade record
    const trade = await tx.trade.create({
      data: {
        userId,
        tokenAddress: mint,
        mint,
        side,
        action: side.toLowerCase(),
        quantity: q,
        price: priceUsd,
        priceSOLPerToken: priceSol,
        grossSol,
        feesSol: totalFees,
        netSol,
        totalCost: tradeCostSol,
        costUsd: tradeCostUsd,
        solUsdAtFill,
        marketCapUsd: mcAtFill,
        route: "Simulated"
      }
    });

    // Fetch/initialize position
    let pos = await tx.position.findUnique({ 
      where: { userId_mint_tradeMode: { userId, mint, tradeMode: 'PAPER' } } 
    });
    if (!pos) {
      pos = await tx.position.create({
        data: { userId, mint, tradeMode: 'PAPER', qty: D(0), costBasis: D(0) }
      });
    }

    let realizedPnL = D(0);

    if (side === "BUY") {
      // Create FIFO lot using shared function
      await createFIFOLot(tx, pos.id, userId, mint, q, priceUsd, priceSol, solUsdAtFill, 'PAPER');

      // Update position using shared function
      pos = await updatePositionBuy(
        tx, userId, mint, 
        pos.qty as Decimal, 
        pos.costBasis as Decimal, 
        q, priceUsd, 
        'PAPER'
      );

      // Deduct SOL from balance
      await tx.user.update({
        where: { id: userId },
        data: { virtualSolBalance: { decrement: tradeCostSol } }
      });

    } else {
      // Execute FIFO sell using shared function
      const lots = await tx.positionLot.findMany({
        where: { userId, mint, qtyRemaining: { gt: 0 } },
        orderBy: { createdAt: "asc" }
      });

      const fifoResult = await executeFIFOSell(tx, userId, mint, q, priceUsd, 'PAPER');
      realizedPnL = fifoResult.realizedPnL;

      // Update position using shared function
      pos = await updatePositionSell(
        tx, userId, mint,
        pos.qty as Decimal,
        pos.costBasis as Decimal,
        q,
        fifoResult.consumed,
        lots,
        'PAPER'
      );

      // Calculate realized PnL in SOL
      const realizedPnLSol = fifoResult.consumed.reduce((sum, c) => {
        const lot = lots.find((l: any) => l.id === c.lotId)!;
        const costSOL = c.qty.mul(lot.unitCostSol || priceSol);
        const proceedsSOL = c.qty.mul(netSol.div(q));
        return sum.plus(proceedsSOL.minus(costSOL));
      }, D(0));

      // Record realized PnL
      await tx.realizedPnL.create({
        data: { 
          userId, 
          mint, 
          pnl: realizedPnL,
          pnlUsd: realizedPnL,
          pnlSol: realizedPnLSol,
          tradeId: trade.id
        }
      });

      // Add SOL back to balance
      await tx.user.update({
        where: { id: userId },
        data: { virtualSolBalance: { increment: tradeCostSol } }
      });
    }

    return { trade, position: pos, realizedPnL };
  });

  // Invalidate token stats cache to ensure fresh data
  try {
    const tokenStatsCacheKey = `token:stats:${userId}:${mint}:PAPER`;
    await redis.del(tokenStatsCacheKey);
    console.log(`[Trade] Invalidated token stats cache: ${tokenStatsCacheKey}`);
  } catch (cacheError) {
    console.error('[Trade] Failed to invalidate token stats cache:', cacheError);
  }

  // Emit real-time PnL event
  try {
    const fillEvent = {
      userId,
      mint,
      tradeMode: 'PAPER' as const,
      side,
      qty: q.toNumber(),
      price: priceUsd.toNumber(),
      fees: totalFees.mul(solUsdAtFill).toNumber(),
      timestamp: Date.now()
    };

    if (side === 'BUY') {
      await realtimePnLService.processBuyFill(fillEvent);
    } else {
      await realtimePnLService.processSellFill(fillEvent);
    }

    console.log(`[Trade] Real-time PnL event emitted for ${side} of ${mint.slice(0, 8)}`);
  } catch (pnlError) {
    console.error('[Trade] Failed to update real-time PnL:', pnlError);
  }

  // Execute post-trade operations using shared function
  await executePostTradeOperations(userId, mint, tradeCostUsd);

  // Note: PumpPortal subscription now happens BEFORE price fetch (line 97)
  // This ensures real-time prices are available for the trade itself

  // Calculate portfolio totals
  const portfolioTotals = await calculatePortfolioTotals(userId);

  // Get token metadata for notification
  const tokenMeta = await prisma.token.findUnique({ where: { address: mint } });
  const tokenSymbol = tokenMeta?.symbol || 'Unknown';
  const tokenName = tokenMeta?.name || 'Unknown Token';

  // Create trade notification
  await notificationService.notifyTradeExecuted(
    userId,
    side,
    tokenSymbol,
    tokenName,
    mint,
    q,
    priceUsd,
    tradeCostUsd
  );

  // Check for trade milestones
  const tradeCount = await prisma.trade.count({ where: { userId } });
  await notificationService.notifyTradeMilestone(userId, tradeCount);

  // Warm up portfolio cache
  const { getPortfolio } = await import("./portfolioService.js");
  try {
    await getPortfolio(userId);
    console.log(`[Trade] Portfolio cache warmed up successfully for user ${userId}`);
  } catch (err) {
    console.error(`[Trade] Failed to warm portfolio cache:`, err);
  }

  // Record fees for hourly reward pool (collect fees from trades)
  try {
    const feeAmountSOL = totalFees.toNumber(); // Convert Decimal to number
    if (feeAmountSOL > 0) {
      await recordCreatorFees(feeAmountSOL, `${side} trade fees`);
      console.log(`[Trade] Recorded ${feeAmountSOL} SOL fees to hourly reward pool`);
    }
  } catch (feeError) {
    console.error('[Trade] Failed to record fees for reward pool:', feeError);
    // Don't fail the trade if fee recording fails
  }

  return {
    trade: result.trade,
    position: result.position,
    portfolioTotals,
    rewardPointsEarned: tradeCostUsd
  };
}

// Calculate comprehensive portfolio totals
async function calculatePortfolioTotals(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const positions = await prisma.position.findMany({
    where: { userId, qty: { gt: 0 } }
  });

  // Batch fetch all prices
  const mints = positions.map(p => p.mint);
  const prices = await priceService.getPrices(mints);

  let totalValueUsd = D(0);
  let totalCostBasis = D(0);

  for (const pos of positions) {
    let currentPrice = D(prices[pos.mint] || 0);

    // Retry individual fetch if missing
    if (currentPrice.eq(0)) {
      try {
        const individualPrice = await priceService.getPrice(pos.mint);
        if (individualPrice && individualPrice > 0) {
          currentPrice = D(individualPrice);
        } else {
          continue;
        }
      } catch (err) {
        const error = err as Error;
        if (!error.message?.includes('aborted') && !error.message?.includes('404')) {
          console.error(`[Portfolio] Unexpected error for ${pos.mint.slice(0, 8)}:`, error);
        }
        continue;
      }
    }

    const positionQty = pos.qty as Decimal;
    const positionCostBasis = pos.costBasis as Decimal;
    const positionValue = positionQty.mul(currentPrice);

    totalValueUsd = totalValueUsd.add(positionValue);
    totalCostBasis = totalCostBasis.add(positionCostBasis);
  }

  // Get total realized PnL
  const realizedPnLRecords = await prisma.realizedPnL.findMany({ where: { userId } });
  const totalRealizedPnL = realizedPnLRecords.reduce(
    (sum, record) => sum.add(record.pnl as Decimal),
    D(0)
  );

  const unrealizedPnL = totalValueUsd.sub(totalCostBasis);
  const solBalance = user?.virtualSolBalance as Decimal || D(0);

  return {
    totalValueUsd,
    totalCostBasis,
    unrealizedPnL,
    realizedPnL: totalRealizedPnL,
    solBalance
  };
}
