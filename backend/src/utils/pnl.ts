// PnL utils placeholder
import { Decimal } from "@prisma/client/runtime/library";

export const D = (x: Decimal | number | string) => new Decimal(x);

// VWAP for buys: returns new {qty, costBasisUsd}
export function vwapBuy(oldQty: Decimal, oldBasis: Decimal, buyQty: Decimal, fillPriceUsd: Decimal) {
  const newQty = oldQty.add(buyQty);
  const newBasis = oldQty.eq(0)
    ? fillPriceUsd
    : oldQty.mul(oldBasis).add(buyQty.mul(fillPriceUsd)).div(newQty);
  return { newQty, newBasis };
}

// FIFO sell across lots
export function fifoSell(
  lots: { id: string; qtyRemaining: Decimal; unitCostUsd: Decimal }[],
  sellQty: Decimal,
  fillPriceUsd: Decimal
) {
  let toSell = sellQty;
  let realized = D(0);
  const consumed: { lotId: string; qty: Decimal; pnl: Decimal }[] = [];

  for (const lot of lots) {
    if (toSell.lte(0)) break;
    const take = Decimal.min(lot.qtyRemaining, toSell);
    const pnl = take.mul(fillPriceUsd.sub(lot.unitCostUsd));
    realized = realized.add(pnl);
    consumed.push({ lotId: lot.id, qty: take, pnl });
    toSell = toSell.sub(take);
  }
  if (toSell.gt(0)) throw new Error("Insufficient quantity to sell");

  return { realized, consumed };
}
