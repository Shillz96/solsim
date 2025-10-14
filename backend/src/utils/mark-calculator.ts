/**
 * Mark Calculator
 * Calculates current market value and unrealized PnL
 */
import { Decimal } from "@prisma/client/runtime/library";
import { tokenUnitsToDecimal } from "./decimal-helpers.js";

export type OpenLot = {
  qtyOpenUnits: bigint;
  costSOL: Decimal;
  costUSD: Decimal;
};

export type MarkResult = {
  qtyTokens: Decimal;
  markValueSOL: Decimal;
  markValueUSD: Decimal;
  unrealizedSOL: Decimal;
  unrealizedUSD: Decimal;
  remainingCostSOL: Decimal;
  remainingCostUSD: Decimal;
};

/**
 * Mark position to current market prices
 * Uses TWAP midprice and current SOL/USD rate
 */
export function markPositionNow(
  openLots: OpenLot[],
  priceSOLPerToken: Decimal, // TWAP midprice (not last trade!)
  solUsdNow: Decimal,
  tokenDecimals: number
): MarkResult {
  // Sum up all open quantity
  const qtyUnits = openLots.reduce((s, l) => s + l.qtyOpenUnits, 0n);
  const qtyTokens = tokenUnitsToDecimal(qtyUnits, tokenDecimals);

  // Mark value at current prices
  const markValueSOL = qtyTokens.mul(priceSOLPerToken);
  const markValueUSD = markValueSOL.mul(solUsdNow);

  // Remaining cost basis (frozen at buy-time FX rates)
  const remainingCostSOL = openLots.reduce(
    (s, l) => s.plus(l.costSOL),
    new Decimal(0)
  );
  const remainingCostUSD = openLots.reduce(
    (s, l) => s.plus(l.costUSD),
    new Decimal(0)
  );

  // Unrealized PnL
  const unrealizedSOL = markValueSOL.minus(remainingCostSOL);
  const unrealizedUSD = markValueUSD.minus(remainingCostUSD);

  return {
    qtyTokens,
    markValueSOL,
    markValueUSD,
    unrealizedSOL,
    unrealizedUSD,
    remainingCostSOL,
    remainingCostUSD,
  };
}
