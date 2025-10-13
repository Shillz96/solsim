/**
 * PnL Computation Service - Worker-Safe with Integer-Only Math
 * 
 * Key principles:
 * 1. All quantities stored as integer strings in base units
 * 2. Never JSON-encode BigInt; always use string
 * 3. FIFO lot tracking for realized PnL
 * 4. Single canonical mark price for unrealized PnL
 * 5. Proper fee apportionment across partial fills
 * 
 * Base units:
 * - SOL amounts: lamports (1 SOL = 1,000,000,000 lamports)
 * - Token amounts: mint-scaled units (respecting token decimals)
 * - Prices: lamports per base unit
 */

export type Fill = {
  side: "BUY" | "SELL";
  qtyBaseUnits: string;     // integer string in token's base units
  priceLamports: string;    // integer string - lamports per base unit
  feeLamports: string;      // integer string - total fee in lamports
  ts: number;               // timestamp for FIFO ordering
  fillId?: string;          // optional unique identifier
};

export type PnLResult = {
  realizedLamports: string;      // total realized PnL in lamports
  unrealizedLamports: string;    // unrealized PnL based on mark price
  openQuantity: string;          // remaining open position in base units
  averageCostLamports: string;   // average cost per base unit (0 if no position)
  totalCostBasis: string;        // total cost basis of open position
  openLots: Array<{              // individual lots for debugging
    qty: string;
    costLamports: string;
    avgPrice: string;
  }>;
};

/**
 * Compute PnL for a series of fills using FIFO lot tracking
 * 
 * @param fills - Array of fills, will be sorted by timestamp
 * @param markPriceLamports - Current market price in lamports per base unit
 * @returns Complete PnL breakdown with integer precision
 */
export function computePnL(fills: Fill[], markPriceLamports: string): PnLResult {
  // Validate inputs
  if (!markPriceLamports || markPriceLamports === "0") {
    throw new Error("Mark price must be provided and non-zero");
  }

  // Sort fills by timestamp for FIFO processing
  const sortedFills = [...fills].sort((a, b) => a.ts - b.ts);
  
  // FIFO lot tracking - each lot has quantity and total cost
  const openLots: Array<{ qty: bigint; costLamports: bigint }> = [];
  let realizedLamports = 0n;

  console.log(`🧮 Computing PnL for ${sortedFills.length} fills with mark price ${markPriceLamports}`);

  for (const fill of sortedFills) {
    try {
      const qty = BigInt(fill.qtyBaseUnits);
      const price = BigInt(fill.priceLamports);
      const fee = BigInt(fill.feeLamports);

      console.log(`  Processing ${fill.side} ${qty} @ ${price} (fee: ${fee})`);

      if (fill.side === "BUY") {
        // Add new lot: cost = quantity × price + allocated fee
        const totalCost = qty * price + fee;
        openLots.push({ 
          qty, 
          costLamports: totalCost 
        });
        
        console.log(`    Added lot: qty=${qty}, cost=${totalCost}`);
        
      } else { // SELL
        let remainingToSell = qty;
        let totalSellFee = fee;
        
        while (remainingToSell > 0n && openLots.length > 0) {
          const lot = openLots[0];
          
          // Determine how much to take from this lot
          const takeFromLot = remainingToSell < lot.qty ? remainingToSell : lot.qty;
          
          // Calculate proportional cost basis for this portion
          const proportionalCost = lot.costLamports * takeFromLot / lot.qty;
          
          // Calculate proceeds from this portion
          const grossProceeds = takeFromLot * price;
          
          // Apportion sell fee proportionally
          const proportionalFee = totalSellFee * takeFromLot / qty;
          const netProceeds = grossProceeds - proportionalFee;
          
          // Realized PnL = net proceeds - cost basis
          const realizedForThisPortion = netProceeds - proportionalCost;
          realizedLamports += realizedForThisPortion;
          
          console.log(`    Closed portion: ${takeFromLot} units`);
          console.log(`      Cost basis: ${proportionalCost}`);
          console.log(`      Net proceeds: ${netProceeds}`);
          console.log(`      Realized PnL: ${realizedForThisPortion}`);
          
          // Update lot
          lot.qty -= takeFromLot;
          lot.costLamports -= proportionalCost;
          
          // Remove lot if fully consumed
          if (lot.qty === 0n) {
            openLots.shift();
            console.log(`    Lot fully closed`);
          }
          
          remainingToSell -= takeFromLot;
        }
        
        // If we still have quantity to sell but no lots, that's a short position
        // For now, we'll treat this as an error, but could support shorts later
        if (remainingToSell > 0n) {
          console.warn(`⚠️ Attempted to sell ${remainingToSell} more than position allows`);
          // Could throw error or handle as short position
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing fill:`, fill, error);
      throw new Error(`Failed to process fill: ${error}`);
    }
  }

  // Calculate unrealized PnL from remaining open lots
  const markPrice = BigInt(markPriceLamports);
  let unrealizedLamports = 0n;
  let totalOpenQty = 0n;
  let totalCostBasis = 0n;

  for (const lot of openLots) {
    const markValue = lot.qty * markPrice;
    const unrealizedForLot = markValue - lot.costLamports;
    unrealizedLamports += unrealizedForLot;
    totalOpenQty += lot.qty;
    totalCostBasis += lot.costLamports;
    
    console.log(`  Open lot: ${lot.qty} units, cost ${lot.costLamports}, mark value ${markValue}, unrealized ${unrealizedForLot}`);
  }

  // Calculate average cost per unit (avoid division by zero)
  const averageCostLamports = totalOpenQty > 0n ? totalCostBasis / totalOpenQty : 0n;

  console.log(`✅ PnL computation complete:`);
  console.log(`  Realized: ${realizedLamports} lamports`);
  console.log(`  Unrealized: ${unrealizedLamports} lamports`);
  console.log(`  Open quantity: ${totalOpenQty} base units`);
  console.log(`  Average cost: ${averageCostLamports} lamports per unit`);

  return {
    realizedLamports: realizedLamports.toString(),
    unrealizedLamports: unrealizedLamports.toString(),
    openQuantity: totalOpenQty.toString(),
    averageCostLamports: averageCostLamports.toString(),
    totalCostBasis: totalCostBasis.toString(),
    openLots: openLots.map(lot => ({
      qty: lot.qty.toString(),
      costLamports: lot.costLamports.toString(),
      avgPrice: lot.qty > 0n ? (lot.costLamports / lot.qty).toString() : "0"
    }))
  };
}

/**
 * Helper to convert display amounts to base units
 * For SOL: display amount × 1e9 = lamports
 * For tokens: display amount × 10^decimals = base units
 */
export function toBaseUnits(displayAmount: number, decimals: number): string {
  const multiplier = 10n ** BigInt(decimals);
  const baseUnits = BigInt(Math.round(displayAmount * Number(multiplier)));
  return baseUnits.toString();
}

/**
 * Helper to convert base units to display amounts
 * For SOL: lamports ÷ 1e9 = display amount
 * For tokens: base units ÷ 10^decimals = display amount
 */
export function fromBaseUnits(baseUnits: string, decimals: number): number {
  const units = BigInt(baseUnits);
  const divisor = 10n ** BigInt(decimals);
  return Number(units) / Number(divisor);
}

/**
 * Helper to create a fill record with proper integer conversion
 */
export function createFill(
  side: "BUY" | "SELL",
  displayQty: number,
  displayPrice: number, // in SOL per token
  feeInSol: number,
  tokenDecimals: number,
  timestamp: number = Date.now(),
  fillId?: string
): Fill {
  // Convert quantities to base units
  const qtyBaseUnits = toBaseUnits(displayQty, tokenDecimals);
  const priceLamports = toBaseUnits(displayPrice, 9); // SOL has 9 decimals
  const feeLamports = toBaseUnits(feeInSol, 9);

  return {
    side,
    qtyBaseUnits,
    priceLamports,
    feeLamports,
    ts: timestamp,
    fillId
  };
}

/**
 * Validate PnL computation input
 */
export function validateFills(fills: Fill[]): void {
  for (const fill of fills) {
    if (!fill.qtyBaseUnits || !fill.priceLamports || !fill.feeLamports) {
      throw new Error(`Invalid fill: missing required fields`);
    }
    
    try {
      BigInt(fill.qtyBaseUnits);
      BigInt(fill.priceLamports);
      BigInt(fill.feeLamports);
    } catch {
      throw new Error(`Invalid fill: non-integer values detected`);
    }
    
    if (!["BUY", "SELL"].includes(fill.side)) {
      throw new Error(`Invalid fill side: ${fill.side}`);
    }
  }
}