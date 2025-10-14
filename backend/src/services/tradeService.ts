// Enhanced Trade service with comprehensive portfolio updates
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import priceService from "../plugins/priceService.js";
import { D, vwapBuy, fifoSell } from "../utils/pnl.js";
import { simulateFees } from "../utils/decimal-helpers.js";
import { addTradePoints } from "./rewardService.js";
import { portfolioCoalescer } from "../utils/requestCoalescer.js";
import * as notificationService from "./notificationService.js";

// Helper for market cap VWAP
function mcVwapUpdate(oldQty: Decimal, oldMcVwap: Decimal, buyQty: Decimal, mcAtFillUsd: Decimal | null) {
  if (!mcAtFillUsd || mcAtFillUsd.lte(0)) return oldMcVwap;
  const newQty = oldQty.add(buyQty);
  return oldQty.eq(0)
    ? mcAtFillUsd
    : oldQty.mul(oldMcVwap).add(buyQty.mul(mcAtFillUsd)).div(newQty);
}

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
  const q = D(qty);
  if (q.lte(0)) throw new Error("Quantity must be greater than 0");

  // Debug logging for trade execution
  console.log(`[Trade] ${side} order: userId=${userId}, mint=${mint.substring(0, 8)}..., qty=${qty}`);

  // Get user to check SOL balance
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Grab latest tick from cache with validation
  const tick = await priceService.getLastTick(mint);
  if (!tick) {
    throw new Error(`Price data unavailable for token ${mint}`);
  }

  // Validate price is not zero or negative
  if (!tick.priceUsd || tick.priceUsd <= 0) {
    throw new Error(`Invalid price for token ${mint}: $${tick.priceUsd}. Cannot execute trade with zero or negative price.`);
  }

  // Validate price is not stale (older than 5 minutes)
  const PRICE_STALENESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
  const priceAge = Date.now() - tick.timestamp;
  if (priceAge > PRICE_STALENESS_THRESHOLD) {
    throw new Error(
      `Price data is stale for token ${mint} (${Math.floor(priceAge / 1000)}s old). ` +
      `Please try again in a moment when fresh price data is available.`
    );
  }

  const priceUsd = D(tick.priceUsd);
  const currentSolPrice = priceService.getSolPrice();

  // Validate SOL price is not zero
  if (currentSolPrice <= 0) {
    throw new Error(`Invalid SOL price: $${currentSolPrice}. Cannot execute trade.`);
  }

  const solUsdAtFill = D(currentSolPrice); // Freeze SOL→USD FX at fill time
  const priceSol = priceUsd.div(solUsdAtFill); // Token price in SOL terms
  const mcAtFill = tick.marketCapUsd ? D(tick.marketCapUsd) : null;

  // Calculate gross trade amounts (before fees)
  const grossSol = q.mul(priceSol);
  const grossUsd = q.mul(priceUsd);

  // Calculate fees (DEX + L1 + priority tip)
  const fees = simulateFees(grossSol);
  const totalFees = fees.dexFee.plus(fees.l1Fee).plus(fees.tipFee);

  // Calculate net amounts (including fees in cost basis)
  let netSol: Decimal;
  let tradeCostSol: Decimal;
  let tradeCostUsd: Decimal;

  if (side === "BUY") {
    // For buys: net = gross + fees (we pay more)
    netSol = grossSol.plus(totalFees);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill); // Freeze USD at fill time
  } else {
    // For sells: net = gross - fees (we receive less)
    netSol = grossSol.minus(totalFees);
    tradeCostSol = netSol;
    tradeCostUsd = netSol.mul(solUsdAtFill); // Freeze USD at fill time
  }

  // Debug logging for price and cost calculations
  console.log(`[Trade] Price: USD=${priceUsd.toString()}, SOL=${priceSol.toString()}`);
  console.log(`[Trade] Cost: SOL=${tradeCostSol.toString()}, USD=${tradeCostUsd.toString()}`);

  // For BUY orders, check if user has enough SOL balance
  if (side === "BUY") {
    const currentBalance = user.virtualSolBalance as Decimal;
    if (currentBalance.lt(tradeCostSol)) {
      throw new Error(`Insufficient SOL balance. Required: ${tradeCostSol.toFixed(4)} SOL, Available: ${currentBalance.toFixed(4)} SOL`);
    }
  }

  // For SELL orders, check if user has enough tokens
  if (side === "SELL") {
    const position = await prisma.position.findUnique({ 
      where: { userId_mint: { userId, mint } } 
    });
    if (!position || (position.qty as Decimal).lt(q)) {
      const available = position ? (position.qty as Decimal).toFixed(4) : "0";
      throw new Error(`Insufficient token balance. Required: ${q.toFixed(4)}, Available: ${available}`);
    }
  }

  // Create trade record using a transaction to ensure consistency
  const result = await prisma.$transaction(async (tx) => {
    // Create trade record with enhanced tracking
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
        route: "Simulated" // Can be enhanced to detect actual DEX route
      }
    });

    // Fetch/initialize position
    let pos = await tx.position.findUnique({ where: { userId_mint: { userId, mint } } });
    if (!pos) {
      pos = await tx.position.create({
        data: { userId, mint, qty: D(0), costBasis: D(0) }
      });
    }

    let realizedPnL = D(0);

    if (side === "BUY") {
      // Create new lot for FIFO tracking with frozen FX rates
      await tx.positionLot.create({
        data: { 
          positionId: pos.id,
          userId, 
          mint, 
          qtyRemaining: q, 
          unitCostUsd: priceUsd,
          unitCostSol: priceSol,
          solUsdAtBuy: solUsdAtFill // Freeze SOL→USD FX at buy time
        }
      });

      // Update position using VWAP
      const newVWAP = vwapBuy(pos.qty as Decimal, pos.costBasis as Decimal, q, priceUsd);
      pos = await tx.position.update({
        where: { userId_mint: { userId, mint } },
        data: {
          qty: newVWAP.newQty,
          costBasis: newVWAP.newBasis
        }
      });

      // Deduct SOL from user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          virtualSolBalance: {
            decrement: tradeCostSol
          }
        }
      });

    } else {
      // SELL: Consume lots using FIFO
      const lots = await tx.positionLot.findMany({
        where: { userId, mint, qtyRemaining: { gt: 0 } },
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

      // Update position - calculate new cost basis by removing consumed lots' cost
      const newQty = (pos.qty as Decimal).sub(q);

      // Calculate total consumed cost from the FIFO calculation (more precise)
      const totalConsumedCost = consumed.reduce((sum, c) => {
        const lot = lots.find((l: any) => l.id === c.lotId)!;
        return sum.add(c.qty.mul(lot.unitCostUsd as Decimal));
      }, D(0));

      let newBasis = (pos.costBasis as Decimal).sub(totalConsumedCost);

      // Validation: newBasis should never be negative
      if (newBasis.lt(0)) {
        console.error(`⚠️ FIFO calculation error: negative cost basis ${newBasis.toString()} for position ${pos.id}`);
        console.error(`Position details: qty=${(pos.qty as Decimal).toString()}, costBasis=${(pos.costBasis as Decimal).toString()}`);
        console.error(`Consumed: ${consumed.length} lots, total cost: ${totalConsumedCost.toString()}`);
        newBasis = D(0); // Clamp to zero to prevent negative values
      }

      if (newQty.eq(0)) newBasis = D(0);

      pos = await tx.position.update({
        where: { userId_mint: { userId, mint } },
        data: { qty: newQty, costBasis: newBasis }
      });

      // Calculate realized PnL in both SOL and USD (frozen at sell time)
      const realizedPnLSol = consumed.reduce((sum, c) => {
        const lot = lots.find((l: any) => l.id === c.lotId)!;
        const costSOL = c.qty.mul(lot.unitCostSol || priceSol);
        const proceedsSOL = c.qty.mul(netSol.div(q)); // Proportional proceeds
        return sum.plus(proceedsSOL.minus(costSOL));
      }, D(0));

      // Record realized PnL with both currencies
      await tx.realizedPnL.create({
        data: { 
          userId, 
          mint, 
          pnl: realized, // Legacy USD field
          pnlUsd: realized, // Explicit USD (frozen at sell)
          pnlSol: realizedPnLSol, // SOL PnL (frozen at sell)
          tradeId: trade.id
        }
      });

      // Add SOL back to user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          virtualSolBalance: {
            increment: tradeCostSol
          }
        }
      });
    }

    return { trade, position: pos, realizedPnL };
  });

  // Add reward points for this trade (outside transaction for performance)
  const tradeValueUsd = tradeCostUsd;
  await addTradePoints(userId, tradeValueUsd);

  // CRITICAL: Invalidate portfolio cache to prevent stale data
  portfolioCoalescer.invalidate(`portfolio:${userId}`);
  console.log(`[Trade] Invalidated portfolio cache for user ${userId}`);

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

  return {
    trade: result.trade,
    position: result.position,
    portfolioTotals,
    rewardPointsEarned: tradeValueUsd
  };
}

// Calculate comprehensive portfolio totals
async function calculatePortfolioTotals(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const positions = await prisma.position.findMany({
    where: { userId, qty: { gt: 0 } }
  });

  // Batch fetch all prices at once
  const mints = positions.map(p => p.mint);
  const prices = await priceService.getPrices(mints);

  let totalValueUsd = D(0);
  let totalCostBasis = D(0);

  // Calculate current value of all positions
  for (const pos of positions) {
    const currentPrice = D(prices[pos.mint] || 0);
    if (currentPrice.eq(0)) {
      console.warn(`No price data available for position ${pos.mint}, skipping...`);
      continue;
    }

    const positionQty = pos.qty as Decimal;
    const positionCostBasis = pos.costBasis as Decimal; // This is now total cost basis, not per-unit

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
