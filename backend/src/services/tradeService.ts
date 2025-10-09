// Trade service placeholder
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import priceService from "../plugins/priceService.js";
import { D, vwapBuy, fifoSell } from "../utils/pnl.js";
import { addTradePoints } from "./rewardService.js"; // ⬅️ new import

// Helper for market cap VWAP
function mcVwapUpdate(oldQty: Decimal, oldMcVwap: Decimal, buyQty: Decimal, mcAtFillUsd: Decimal | null) {
  if (!mcAtFillUsd || mcAtFillUsd.lte(0)) return oldMcVwap;
  const newQty = oldQty.add(buyQty);
  return oldQty.eq(0)
    ? mcAtFillUsd
    : oldQty.mul(oldMcVwap).add(buyQty.mul(mcAtFillUsd)).div(newQty);
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
}) {
  const q = D(qty);
  if (q.lte(0)) throw new Error("qty must be > 0");

  // Grab latest tick from cache
  const tick = await priceService.getLastTick(mint);
  const priceUsd = D(tick.priceUsd);
  const priceSol = D(tick.priceSol || priceUsd); // Fallback to priceUsd if priceSol not available
  const solUsd = D(tick.solUsd || 100); // Default SOL price if not available
  const mcAtFill = tick.marketCapUsd ? D(tick.marketCapUsd) : null;

  // Persist trade
  const trade = await prisma.trade.create({
    data: {
      userId,
      mint,
      side,
      qty: q,
      fillPriceSol: priceSol,
      fillPriceUsd: priceUsd,
      solUsdAtFill: solUsd,
      marketCapAtFillUsd: mcAtFill,
      source: tick.source
    }
  });

  // Fetch/initialize position
  let pos = await prisma.position.findUnique({ where: { userId_mint: { userId, mint } } });
  if (!pos) {
    pos = await prisma.position.create({
      data: { userId, mint, qty: D(0), costBasisUsd: D(0), mcVwapUsd: D(0) }
    });
  }

  if (side === "BUY") {
    // New lot
    await prisma.positionLot.create({
      data: { userId, mint, qtyRemaining: q, unitCostUsd: priceUsd }
    });

    // Update VWAP + MarketCap VWAP
    const newVWAP = vwapBuy(pos.qty as any, pos.costBasisUsd as any, q, priceUsd);
    const newMc = mcVwapUpdate(pos.qty as any, pos.mcVwapUsd as any, q, mcAtFill);

    pos = await prisma.position.update({
      where: { userId_mint: { userId, mint } },
      data: {
        qty: newVWAP.newQty,
        costBasisUsd: newVWAP.newBasis,
        mcVwapUsd: newMc,
        updatedAt: new Date()
      }
    });
  } else {
    // SELL → consume lots FIFO
    const lots = await prisma.positionLot.findMany({
      where: { userId, mint, qtyRemaining: { gt: 0 } },
      orderBy: { createdAt: "asc" }
    });

    const { realized, consumed } = fifoSell(
      lots.map((l: any) => ({
        id: l.id,
        qtyRemaining: l.qtyRemaining as any,
        unitCostUsd: l.unitCostUsd as any
      })),
      q,
      priceUsd
    );

    for (const c of consumed) {
      const lot = lots.find((l: any) => l.id === c.lotId)!;
      const newQty = (lot.qtyRemaining as any as Decimal).sub(c.qty);
      await prisma.positionLot.update({ where: { id: lot.id }, data: { qtyRemaining: newQty } });
    }

    const newQty = (pos.qty as any as Decimal).sub(q);
    let newBasis = pos.costBasisUsd as any as Decimal;
    if (newQty.eq(0)) newBasis = D(0);

    pos = await prisma.position.update({
      where: { userId_mint: { userId, mint } },
      data: { qty: newQty, costBasisUsd: newBasis, updatedAt: new Date() }
    });

    // Record realized PnL
    await prisma.realizedPnl.create({
      data: { userId, mint, tradeId: trade.id, realizedUsd: realized }
    });
  }

  // --- NEW: add reward points for this trade ---
  const tradeValueUsd = q.mul(priceUsd); // notional size in USD
  await addTradePoints(userId, tradeValueUsd);

  return { trade, position: pos };
}
