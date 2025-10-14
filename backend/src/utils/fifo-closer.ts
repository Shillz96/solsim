/**
 * FIFO Lot Closer
 * Closes lots in FIFO order and calculates realized PnL in both SOL and USD
 */
import { Decimal } from "@prisma/client/runtime/library";

export type Lot = {
  id: string;
  qtyOpenUnits: bigint;
  costSOL: Decimal;
  costUSD: Decimal;
};

export type Sell = {
  qtyUnits: bigint; // units to close
  netProceedsSOL: Decimal; // includes sell-side fees already deducted
  solUsdAtFill: Decimal; // freeze USD at sell time
};

export type ClosureResult = {
  realizedSOL: Decimal;
  realizedUSD: Decimal;
  closures: Array<{
    lotId: string;
    qtyClosedUnits: bigint;
    costSOLPiece: Decimal;
    costUSDPiece: Decimal;
    proceedsSOLPiece: Decimal;
    proceedsUSDPiece: Decimal;
    pnlSOL: Decimal;
    pnlUSD: Decimal;
  }>;
};

/**
 * Close lots using FIFO and calculate realized PnL
 * Mutates lots in place (reduces qtyOpenUnits, costSOL, costUSD)
 */
export function closeFIFO(lots: Lot[], sell: Sell): ClosureResult {
  let remaining = sell.qtyUnits;
  let realizedSOL = new Decimal(0);
  let realizedUSD = new Decimal(0);
  const closures: ClosureResult["closures"] = [];

  // Effective price per unit (in SOL) for the sell
  const sellPriceSOLPerUnit = sell.netProceedsSOL.div(
    new Decimal(remaining.toString())
  );

  for (const lot of lots) {
    if (remaining === 0n) break;
    if (lot.qtyOpenUnits === 0n) continue;

    const take = remaining < lot.qtyOpenUnits ? remaining : lot.qtyOpenUnits;

    const takeRatio = new Decimal(take.toString()).div(
      new Decimal(lot.qtyOpenUnits.toString())
    );

    const costSOLPiece = lot.costSOL.mul(takeRatio);
    const costUSDPiece = lot.costUSD.mul(takeRatio);

    const proceedsSOLPiece = sellPriceSOLPerUnit.mul(
      new Decimal(take.toString())
    );
    const proceedsUSDPiece = proceedsSOLPiece.mul(sell.solUsdAtFill);

    const pnlSOL = proceedsSOLPiece.minus(costSOLPiece);
    const pnlUSD = proceedsUSDPiece.minus(costUSDPiece);

    realizedSOL = realizedSOL.plus(pnlSOL);
    realizedUSD = realizedUSD.plus(pnlUSD);

    closures.push({
      lotId: lot.id,
      qtyClosedUnits: take,
      costSOLPiece,
      costUSDPiece,
      proceedsSOLPiece,
      proceedsUSDPiece,
      pnlSOL,
      pnlUSD,
    });

    // Reduce the lot (mutate in place)
    lot.qtyOpenUnits -= take;
    lot.costSOL = lot.costSOL.minus(costSOLPiece);
    lot.costUSD = lot.costUSD.minus(costUSDPiece);

    remaining -= take;
  }

  if (remaining > 0n) {
    throw new Error(
      `Insufficient quantity to sell. Need ${sell.qtyUnits}, only have ${
        sell.qtyUnits - remaining
      }`
    );
  }

  return { realizedSOL, realizedUSD, closures };
}
