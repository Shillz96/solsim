// Enhanced Trade service with comprehensive portfolio updates
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import priceService from "../plugins/priceService.js";
import { D, vwapBuy, fifoSell } from "../utils/pnl.js";
import { addTradePoints } from "./rewardService.js";

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

  // Get user to check SOL balance
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Grab latest tick from cache
  const tick = await priceService.getLastTick(mint);
  const priceUsd = D(tick.priceUsd);
  const priceSol = D(tick.priceSol || priceUsd.div(100)); // Fallback calculation
  const solUsd = D(tick.solUsd || 100); // Default SOL price
  const mcAtFill = tick.marketCapUsd ? D(tick.marketCapUsd) : null;

  // Calculate trade cost
  const tradeCostSol = q.mul(priceSol);
  const tradeCostUsd = q.mul(priceUsd);

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
        totalCost: tradeCostSol,
        costUsd: tradeCostUsd,
        marketCapUsd: mcAtFill
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
      // Create new lot for FIFO tracking
      await tx.positionLot.create({
        data: { 
          positionId: pos.id,
          userId, 
          mint, 
          qtyRemaining: q, 
          unitCostUsd: priceUsd 
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

      // Update position
      const newQty = (pos.qty as Decimal).sub(q);
      let newBasis = pos.costBasis as Decimal;
      if (newQty.eq(0)) newBasis = D(0);

      pos = await tx.position.update({
        where: { userId_mint: { userId, mint } },
        data: { qty: newQty, costBasis: newBasis }
      });

      // Record realized PnL
      await tx.realizedPnL.create({
        data: { userId, mint, pnl: realized }
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

  // Calculate portfolio totals
  const portfolioTotals = await calculatePortfolioTotals(userId);

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
  
  let totalValueUsd = D(0);
  let totalCostBasis = D(0);
  
  // Calculate current value of all positions
  for (const pos of positions) {
    const tick = await priceService.getLastTick(pos.mint);
    const currentPrice = D(tick.priceUsd);
    const positionValue = (pos.qty as Decimal).mul(currentPrice);
    const positionCost = (pos.qty as Decimal).mul(pos.costBasis as Decimal);
    
    totalValueUsd = totalValueUsd.add(positionValue);
    totalCostBasis = totalCostBasis.add(positionCost);
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
