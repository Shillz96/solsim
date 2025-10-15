/**
 * Enhanced Trade Service v2
 * Implements proper fee handling, FX freezing, and FIFO lot tracking
 */
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import priceService from "../plugins/priceService.js";
import { closeFIFO, type Lot, type Sell } from "../utils/fifo-closer.js";
import { simulateFees } from "../utils/decimal-helpers.js";
import { addTradePoints } from "./rewardService.js";
import { portfolioCoalescer } from "../utils/requestCoalescer.js";

const D = (x: Decimal | number | string) => new Decimal(x);

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

export async function fillTradeV2({
  userId,
  mint,
  side,
  qty,
}: {
  userId: string;
  mint: string;
  side: "BUY" | "SELL";
  qty: string;
}): Promise<TradeResult> {
  let q = D(qty);
  if (q.lte(0)) throw new Error("Quantity must be greater than 0");

  console.log(`[TradeV2] ${side} order: userId=${userId}, mint=${mint.substring(0, 8)}..., qty=${qty}`);

  // Get user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Get price tick
  const tick = await priceService.getLastTick(mint);
  if (!tick || !tick.priceUsd || tick.priceUsd <= 0) {
    throw new Error(`Price data unavailable or invalid for token ${mint}`);
  }

  // Validate price freshness (5 minutes)
  const priceAge = Date.now() - tick.timestamp;
  if (priceAge > 5 * 60 * 1000) {
    throw new Error(`Price data is stale for token ${mint} (${Math.floor(priceAge / 1000)}s old)`);
  }

  const priceUsd = D(tick.priceUsd);
  const currentSolPrice = priceService.getSolPrice();
  if (currentSolPrice <= 0) {
    throw new Error(`Invalid SOL price: $${currentSolPrice}`);
  }

  const solUsdAtFill = D(currentSolPrice);
  const priceSol = priceUsd.div(solUsdAtFill);
  const mcAtFill = tick.marketCapUsd ? D(tick.marketCapUsd) : null;

  // For sells, check position and clamp quantity if needed (handles floating-point rounding)
  if (side === "SELL") {
    const position = await prisma.position.findUnique({
      where: { userId_mint: { userId, mint } },
    });
    if (!position) {
      throw new Error(`No position found for token`);
    }

    const positionQty = position.qty as Decimal;
    const difference = positionQty.minus(q);

    // Allow tiny rounding errors (e.g., selling "all" with 0.0001 difference due to floating point)
    const EPSILON = D("0.0001");
    if (difference.lt(EPSILON.neg())) {
      // Position is less than required by more than epsilon
      throw new Error(`Insufficient token balance. Required: ${q.toFixed(4)}, Available: ${positionQty.toFixed(4)}`);
    }

    // If user is trying to sell slightly more than available due to rounding, clamp to available
    if (difference.lt(0) && difference.gte(EPSILON.neg())) {
      console.log(`[TradeV2] ⚠️ Clamping sell quantity from ${q.toString()} to ${positionQty.toString()} (diff: ${difference.toString()})`);
      q = positionQty; // Clamp to exact position quantity
    }
  }

  // Calculate gross trade amounts
  const grossSol = q.mul(priceSol);
  const grossUsd = q.mul(priceUsd);

  // Calculate fees
  const fees = simulateFees(grossSol);
  const totalFees = fees.dexFee.plus(fees.l1Fee).plus(fees.tipFee);

  // Calculate net amounts
  let netSol: Decimal;
  let tradeCostSol: Decimal;
  let tradeCostUsd: Decimal;

  if (side === "BUY") {
    // For buys: net = gross + fees (we spend more)
    netSol = grossSol.plus(totalFees);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill); // Freeze USD at fill time

    // Check balance
    const currentBalance = user.virtualSolBalance as Decimal;
    if (currentBalance.lt(tradeCostSol)) {
      throw new Error(
        `Insufficient SOL balance. Required: ${tradeCostSol.toFixed(4)} SOL, Available: ${currentBalance.toFixed(4)} SOL`
      );
    }
  } else {
    // For sells: net = gross - fees (we receive less)
    netSol = grossSol.minus(totalFees);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill); // Freeze USD at fill time
  }

  console.log(`[TradeV2] Price: USD=${priceUsd.toString()}, SOL=${priceSol.toString()}`);
  console.log(`[TradeV2] Gross SOL=${grossSol.toString()}, Fees=${totalFees.toString()}, Net=${netSol.toString()}`);
  console.log(`[TradeV2] SOL/USD rate at fill: ${solUsdAtFill.toString()}`);

  // Execute trade in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create trade record with enhanced fields
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
        route: "Simulated", // TODO: Add actual routing detection
      },
    });

    // Fetch/initialize position
    let pos = await tx.position.findUnique({ where: { userId_mint: { userId, mint } } });
    if (!pos) {
      pos = await tx.position.create({
        data: { userId, mint, qty: D(0), costBasis: D(0) },
      });
    }

    let realizedPnLSol = D(0);
    let realizedPnLUsd = D(0);

    if (side === "BUY") {
      // Create new lot with frozen FX rates
      await tx.positionLot.create({
        data: {
          positionId: pos.id,
          userId,
          mint,
          qtyRemaining: q,
          unitCostUsd: priceUsd,
          unitCostSol: priceSol,
          solUsdAtBuy: solUsdAtFill,
        },
      });

      // Update position: add quantity and cost basis (includes fees!)
      const newQty = (pos.qty as Decimal).plus(q);
      const newCostBasis = (pos.costBasis as Decimal).plus(tradeCostUsd);

      pos = await tx.position.update({
        where: { userId_mint: { userId, mint } },
        data: {
          qty: newQty,
          costBasis: newCostBasis,
        },
      });

      // Deduct SOL from user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          virtualSolBalance: { decrement: tradeCostSol },
        },
      });
    } else {
      // SELL: Close lots using FIFO
      const lots = await tx.positionLot.findMany({
        where: { userId, mint, qtyRemaining: { gt: 0 } },
        orderBy: { createdAt: "asc" },
      });

      // Convert to Lot format for FIFO closer
      const fifoLots: Lot[] = lots.map((l: any) => ({
        id: l.id,
        qtyOpenUnits: BigInt(Math.floor(parseFloat(l.qtyRemaining.toString()) * 1e9)), // Convert to base units
        costSOL: (l.qtyRemaining as Decimal).mul(l.unitCostSol || priceSol),
        costUSD: (l.qtyRemaining as Decimal).mul(l.unitCostUsd as Decimal),
      }));

      const sell: Sell = {
        qtyUnits: BigInt(Math.floor(parseFloat(q.toString()) * 1e9)),
        netProceedsSOL: netSol,
        solUsdAtFill,
      };

      const closureResult = closeFIFO(fifoLots, sell);

      realizedPnLSol = closureResult.realizedSOL;
      realizedPnLUsd = closureResult.realizedUSD;

      console.log(`[TradeV2] Realized PnL: SOL=${realizedPnLSol.toString()}, USD=${realizedPnLUsd.toString()}`);

      // Update lots in database
      for (let i = 0; i < fifoLots.length; i++) {
        const updatedQty = D(fifoLots[i].qtyOpenUnits.toString()).div(1e9);
        await tx.positionLot.update({
          where: { id: fifoLots[i].id },
          data: { qtyRemaining: updatedQty },
        });
      }

      // Create lot closure records
      for (const closure of closureResult.closures) {
        await tx.lotClosure.create({
          data: {
            lotId: closure.lotId,
            sellTradeId: trade.id,
            userId,
            mint,
            qtyClosedUnits: D(closure.qtyClosedUnits.toString()).div(1e9),
            costSOL: closure.costSOLPiece,
            costUSD: closure.costUSDPiece,
            proceedsSOL: closure.proceedsSOLPiece,
            proceedsUSD: closure.proceedsUSDPiece,
            realizedPnlSOL: closure.pnlSOL,
            realizedPnlUSD: closure.pnlUSD,
          },
        });
      }

      // Update position
      const newQty = (pos.qty as Decimal).minus(q);
      const totalConsumedCostUSD = closureResult.closures.reduce(
        (sum, c) => sum.plus(c.costUSDPiece),
        D(0)
      );
      let newCostBasis = (pos.costBasis as Decimal).minus(totalConsumedCostUSD);

      if (newCostBasis.lt(0)) {
        console.error(`⚠️ Negative cost basis detected, clamping to 0`);
        newCostBasis = D(0);
      }
      if (newQty.eq(0)) newCostBasis = D(0);

      pos = await tx.position.update({
        where: { userId_mint: { userId, mint } },
        data: { qty: newQty, costBasis: newCostBasis },
      });

      // Record realized PnL
      await tx.realizedPnL.create({
        data: {
          userId,
          mint,
          pnl: realizedPnLUsd, // Legacy field
          pnlUsd: realizedPnLUsd,
          pnlSol: realizedPnLSol,
          tradeId: trade.id,
        },
      });

      // Add SOL back to user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          virtualSolBalance: { increment: tradeCostSol },
        },
      });
    }

    return { trade, position: pos, realizedPnLSol, realizedPnLUsd };
  });

  // Add reward points
  const tradeValueUsd = tradeCostUsd;
  await addTradePoints(userId, tradeValueUsd);

  // CRITICAL: Invalidate portfolio cache to prevent stale data
  portfolioCoalescer.invalidate(`portfolio:${userId}`);
  console.log(`[TradeV2] Invalidated portfolio cache for user ${userId}`);

  // Eagerly fetch price to ensure it's cached for the next portfolio request
  await priceService.getPrice(mint);
  console.log(`[TradeV2] Prefetched and cached price for ${mint.substring(0, 8)}...`);

  // Calculate portfolio totals
  const portfolioTotals = await calculatePortfolioTotals(userId);

  // OPTIMIZATION: Warm up portfolio cache immediately after trade
  const { getPortfolio } = await import("./portfolioService.js");
  getPortfolio(userId).catch(err =>
    console.error(`[TradeV2] Failed to warm portfolio cache:`, err)
  );
  console.log(`[TradeV2] Triggered portfolio cache warm-up for user ${userId}`);

  return {
    trade: result.trade,
    position: result.position,
    portfolioTotals,
    rewardPointsEarned: tradeValueUsd,
  };
}

// Calculate comprehensive portfolio totals
async function calculatePortfolioTotals(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const positions = await prisma.position.findMany({
    where: { userId, qty: { gt: 0 } },
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

  const realizedPnLRecords = await prisma.realizedPnL.findMany({ where: { userId } });
  const totalRealizedPnL = realizedPnLRecords.reduce(
    (sum, record) => sum.plus(record.pnlUsd || record.pnl),
    D(0)
  );

  const unrealizedPnL = totalValueUsd.minus(totalCostBasis);
  const solBalance = (user?.virtualSolBalance as Decimal) || D(0);

  return {
    totalValueUsd,
    totalCostBasis,
    unrealizedPnL,
    realizedPnL: totalRealizedPnL,
    solBalance,
  };
}

export default {
  fillTrade: fillTradeV2,
};
