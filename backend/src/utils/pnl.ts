/**
 * PnL Calculation Utilities - Unified Implementation
 * 
 * Combines the best of both implementations:
 * - Decimal-based API for ease of use (compatible with existing code)
 * - FIFO lot tracking for accurate realized PnL
 * - VWAP cost basis calculation
 * - Worker-safe integer math option for high-precision scenarios
 * 
 * This module provides both legacy helpers (vwapBuy, fifoSell) and modern
 * BigInt-based computation (computePnL) for different use cases.
 */

import { Decimal } from "@prisma/client/runtime/library";

// ============================================================================
// LEGACY DECIMAL-BASED HELPERS (for backward compatibility)
// ============================================================================

/**
 * Helper to create Decimal from various inputs
 */
export const D = (x: Decimal | number | string) => new Decimal(x);

/**
 * VWAP calculation for buy trades
 * Returns new quantity and total cost basis after adding a buy
 * 
 * @param oldQty - Current position quantity
 * @param oldTotalCostBasis - Current total cost basis in USD
 * @param buyQty - Quantity being bought
 * @param fillPriceUsd - Fill price in USD per unit
 * @returns New quantity and cost basis after the buy
 */
export function vwapBuy(
  oldQty: Decimal, 
  oldTotalCostBasis: Decimal, 
  buyQty: Decimal, 
  fillPriceUsd: Decimal
) {
  const newQty = oldQty.add(buyQty);
  const additionalCost = buyQty.mul(fillPriceUsd);
  const newTotalCostBasis = oldTotalCostBasis.add(additionalCost);
  return { newQty, newBasis: newTotalCostBasis };
}

/**
 * FIFO sell across lots
 * Consumes lots in order and calculates realized PnL
 * 
 * @param lots - Array of open lots with quantity and cost basis
 * @param sellQty - Quantity being sold
 * @param fillPriceUsd - Fill price in USD per unit
 * @returns Realized PnL and consumed lots
 * @throws Error if insufficient quantity to sell
 */
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
  
  if (toSell.gt(0)) {
    throw new Error(`Insufficient quantity to sell: need ${sellQty}, available ${sellQty.sub(toSell)}`);
  }

  return { realized, consumed };
}

// ============================================================================
// MODERN BIGINT-BASED COMPUTATION (for high-precision, worker-safe scenarios)
// ============================================================================

export type Fill = {
  side: "BUY" | "SELL";
  qtyBaseUnits: string;     // integer string in token's base units
  priceLamports: string;    // integer string - lamports per base unit
  feeLamports: string;      // integer string - total fee in lamports
  ts: number;               // timestamp for FIFO ordering
  solUsdAtFill: string;     // SOL→USD FX rate at fill time
  fillId?: string;          // optional unique identifier
};

export type PnLResult = {
  realizedLamports: string;      // total realized PnL in lamports
  realizedUsd: string;           // total realized PnL in USD (frozen at sell time)
  unrealizedLamports: string;    // unrealized PnL based on mark price
  unrealizedUsd: string;         // unrealized PnL in USD (using current SOL price)
  openQuantity: string;          // remaining open position in base units
  averageCostLamports: string;   // average cost per base unit (0 if no position)
  averageCostUsd: string;        // average cost per base unit in USD (0 if no position)
  totalCostBasis: string;        // total cost basis of open position in lamports
  totalCostBasisUsd: string;     // total cost basis of open position in USD
  openLots: Array<{              // individual lots for debugging
    qty: string;
    costLamports: string;
    costUsd: string;
    avgPrice: string;
    solUsdAtBuy: string;
  }>;
};

/**
 * Compute PnL using FIFO lot tracking with integer-only math
 * 
 * Key principles:
 * 1. All quantities in integer strings (base units)
 * 2. Never JSON-encode BigInt; always use string
 * 3. FIFO lot tracking for realized PnL
 * 4. Dual currency support (SOL + USD)
 * 5. Proper fee apportionment across partial fills
 * 
 * @param fills - Array of fills, will be sorted by timestamp
 * @param markPriceLamports - Current market price in lamports per base unit
 * @param currentSolUsd - Current SOL→USD exchange rate for unrealized USD PnL
 * @param debug - Enable debug logging
 * @returns Complete PnL breakdown with integer precision
 */
export function computePnL(
  fills: Fill[], 
  markPriceLamports: string, 
  currentSolUsd: string = "0",
  debug: boolean = false
): PnLResult {
  // Validate inputs
  if (!markPriceLamports || markPriceLamports === "0") {
    throw new Error("Mark price must be provided and non-zero");
  }

  // Sort fills by timestamp for FIFO processing
  const sortedFills = [...fills].sort((a, b) => a.ts - b.ts);

  // FIFO lot tracking
  const openLots: Array<{
    qty: bigint;
    costLamports: bigint;
    costUsd: bigint;
    solUsdAtBuy: bigint;
  }> = [];
  let realizedLamports = 0n;
  let realizedUsd = 0n;

  const currentSolUsdBigInt = BigInt(Math.round(parseFloat(currentSolUsd) * 1_000_000));

  if (debug) {
    console.log(`🧮 Computing PnL for ${sortedFills.length} fills with mark price ${markPriceLamports}`);
  }

  for (const fill of sortedFills) {
    const qty = BigInt(fill.qtyBaseUnits);
    const price = BigInt(fill.priceLamports);
    const fee = BigInt(fill.feeLamports);
    const solUsdAtFill = BigInt(Math.round(parseFloat(fill.solUsdAtFill) * 1_000_000));

    if (fill.side === "BUY") {
      // Add new lot: cost = quantity × price + fee
      const totalCostLamports = qty * price + fee;
      const totalCostUsd = (totalCostLamports * solUsdAtFill) / 1_000_000_000n;

      openLots.push({
        qty,
        costLamports: totalCostLamports,
        costUsd: totalCostUsd,
        solUsdAtBuy: solUsdAtFill
      });

      if (debug) {
        console.log(`  BUY: ${qty} @ ${price}, cost=${totalCostLamports} lamports`);
      }

    } else { // SELL
      let remainingToSell = qty;

      while (remainingToSell > 0n && openLots.length > 0) {
        const lot = openLots[0];
        const takeFromLot = remainingToSell < lot.qty ? remainingToSell : lot.qty;

        // Calculate proportional cost basis
        const proportionalCostLamports = lot.costLamports * takeFromLot / lot.qty;
        const proportionalCostUsd = lot.costUsd * takeFromLot / lot.qty;

        // Calculate proceeds
        const grossProceeds = takeFromLot * price;
        const proportionalFee = fee * takeFromLot / qty;
        const netProceeds = grossProceeds - proportionalFee;
        const netProceedsUsd = (netProceeds * solUsdAtFill) / 1_000_000_000n;

        // Realized PnL
        realizedLamports += netProceeds - proportionalCostLamports;
        realizedUsd += netProceedsUsd - proportionalCostUsd;

        if (debug) {
          console.log(`  SELL: ${takeFromLot} @ ${price}, realized=${realizedLamports} lamports`);
        }

        // Update lot
        lot.qty -= takeFromLot;
        lot.costLamports -= proportionalCostLamports;
        lot.costUsd -= proportionalCostUsd;

        if (lot.qty === 0n) {
          openLots.shift();
        }

        remainingToSell -= takeFromLot;
      }

      if (remainingToSell > 0n && debug) {
        console.warn(`⚠️ Short position: sold ${remainingToSell} more than held`);
      }
    }
  }

  // Calculate unrealized PnL
  const markPrice = BigInt(markPriceLamports);
  let unrealizedLamports = 0n;
  let unrealizedUsd = 0n;
  let totalOpenQty = 0n;
  let totalCostBasis = 0n;
  let totalCostBasisUsd = 0n;

  for (const lot of openLots) {
    const markValueLamports = lot.qty * markPrice;
    unrealizedLamports += markValueLamports - lot.costLamports;
    
    const markValueSol = markValueLamports / 1_000_000_000n;
    const markValueUsd = (markValueSol * currentSolUsdBigInt) / 1_000_000n;
    unrealizedUsd += markValueUsd - lot.costUsd;
    
    totalOpenQty += lot.qty;
    totalCostBasis += lot.costLamports;
    totalCostBasisUsd += lot.costUsd;
  }

  const averageCostLamports = totalOpenQty > 0n ? totalCostBasis / totalOpenQty : 0n;
  const averageCostUsd = totalOpenQty > 0n ? totalCostBasisUsd / totalOpenQty : 0n;

  return {
    realizedLamports: realizedLamports.toString(),
    realizedUsd: realizedUsd.toString(),
    unrealizedLamports: unrealizedLamports.toString(),
    unrealizedUsd: unrealizedUsd.toString(),
    openQuantity: totalOpenQty.toString(),
    averageCostLamports: averageCostLamports.toString(),
    averageCostUsd: averageCostUsd.toString(),
    totalCostBasis: totalCostBasis.toString(),
    totalCostBasisUsd: totalCostBasisUsd.toString(),
    openLots: openLots.map(lot => ({
      qty: lot.qty.toString(),
      costLamports: lot.costLamports.toString(),
      costUsd: lot.costUsd.toString(),
      avgPrice: lot.qty > 0n ? (lot.costLamports / lot.qty).toString() : "0",
      solUsdAtBuy: lot.solUsdAtBuy.toString()
    }))
  };
}

// ============================================================================
// HELPER FUNCTIONS FOR BIGINT COMPUTATION
// ============================================================================

/**
 * Convert display amounts to base units
 * For SOL: display × 1e9 = lamports
 * For tokens: display × 10^decimals = base units
 */
export function toBaseUnits(displayAmount: number, decimals: number): string {
  const multiplier = 10n ** BigInt(decimals);
  const baseUnits = BigInt(Math.round(displayAmount * Number(multiplier)));
  return baseUnits.toString();
}

/**
 * Convert base units to display amounts
 */
export function fromBaseUnits(baseUnits: string, decimals: number): number {
  const units = BigInt(baseUnits);
  const divisor = 10n ** BigInt(decimals);
  return Number(units) / Number(divisor);
}

/**
 * Create a fill record with proper integer conversion
 */
export function createFill(
  side: "BUY" | "SELL",
  displayQty: number,
  displayPrice: number,
  feeInSol: number,
  tokenDecimals: number,
  solUsdAtFill: number,
  timestamp: number = Date.now(),
  fillId?: string
): Fill {
  return {
    side,
    qtyBaseUnits: toBaseUnits(displayQty, tokenDecimals),
    priceLamports: toBaseUnits(displayPrice, 9),
    feeLamports: toBaseUnits(feeInSol, 9),
    solUsdAtFill: solUsdAtFill.toFixed(6),
    ts: timestamp,
    fillId
  };
}

/**
 * Validate PnL computation input
 */
export function validateFills(fills: Fill[]): void {
  for (const fill of fills) {
    if (!fill.qtyBaseUnits || !fill.priceLamports || !fill.feeLamports || !fill.solUsdAtFill) {
      throw new Error(`Invalid fill: missing required fields`);
    }

    try {
      BigInt(fill.qtyBaseUnits);
      BigInt(fill.priceLamports);
      BigInt(fill.feeLamports);
      parseFloat(fill.solUsdAtFill);
    } catch {
      throw new Error(`Invalid fill: invalid numeric values`);
    }

    if (!["BUY", "SELL"].includes(fill.side)) {
      throw new Error(`Invalid fill side: ${fill.side}`);
    }

    if (parseFloat(fill.solUsdAtFill) <= 0) {
      throw new Error(`Invalid fill: solUsdAtFill must be positive`);
    }
  }
}
