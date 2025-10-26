/**
 * Trade Common - Shared logic for paper and real trading
 * 
 * Extracts common functionality used by both:
 * - tradeService.ts (paper/simulated trading)
 * - realTradeService.ts (real mainnet trading)
 * 
 * This module reduces code duplication while maintaining clear separation
 * between paper and real trading implementations.
 */

import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import priceService from "../plugins/priceService.js";
import { D, vwapBuy, fifoSell } from "../utils/pnl.js";
import { addTradePoints } from "./rewardService.js";
import { portfolioCoalescer } from "../utils/requestCoalescer.js";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type TradeMode = "PAPER" | "REAL";
export type TradeSide = "BUY" | "SELL";

export interface PriceValidationResult {
  priceUsd: Decimal;
  priceSol: Decimal;
  solUsdAtFill: Decimal;
  marketCapUsd: Decimal | null;
  tick: any;
}

export interface PositionCheckResult {
  clampedQty: Decimal;
  wasClamped: boolean;
}

export interface FIFOSellResult {
  realizedPnL: Decimal;
  consumed: Array<{
    lotId: string;
    qty: Decimal;
    pnl: Decimal;
  }>;
}

// ============================================================================
// PRICE VALIDATION AND FETCHING
// ============================================================================

/**
 * Get and validate price data for a token
 * 
 * Handles:
 * - Price fetching from cache (fast path)
 * - Aggressive fresh fetch for new/missing tokens (real-time data)
 * - Multiple fallback attempts (pump.fun API, Jupiter, static fallback)
 * - Price validation (non-zero, non-negative)
 * - Staleness check (5 minute threshold)
 * - SOL price validation
 * 
 * @param mint - Token mint address
 * @param side - Trade side (BUY or SELL)
 * @returns Validated price data including USD, SOL, and market cap
 * @throws Error if price is unavailable, invalid, or stale
 */
export async function getValidatedPrice(
  mint: string,
  side: TradeSide
): Promise<PriceValidationResult> {
  // Get cached tick (fast path)
  let tick = await priceService.getLastTick(mint);

  // If no cached price, aggressively fetch fresh data
  if (!tick) {
    console.warn(`No cached price for ${mint.slice(0, 8)}, fetching fresh real-time data...`);
    priceService.clearNegativeCache(mint);
    
    // Force fresh fetch from pump.fun API, Jupiter, etc.
    tick = await priceService.fetchTokenPrice(mint);
    
    if (tick) {
      console.info({
        mint: mint.slice(0, 8),
        priceUsd: tick.priceUsd,
        source: tick.source
      }, "[RealTimePrice] Fresh price data fetched successfully");
    }
  }

  // Last resort: Use initial bonding curve price for brand new tokens
  // This only triggers if pump.fun API, Jupiter, and all other sources fail
  if (!tick) {
    console.warn(`All price sources failed for ${mint.slice(0, 8)}, using initial bonding curve estimate`);
    
    // New pump.fun tokens start with these virtual reserves:
    // - Virtual SOL: 30 SOL
    // - Virtual Tokens: 1,073,000,000 tokens (with 6 decimals)
    // Initial price = 30 / 1,073,000,000 = ~0.000000028 SOL per token
    const INITIAL_VIRTUAL_SOL = 30;
    const INITIAL_VIRTUAL_TOKENS = 1_073_000_000;
    const initialPriceSol = INITIAL_VIRTUAL_SOL / INITIAL_VIRTUAL_TOKENS;
    
    const currentSolPrice = priceService.getSolPrice();
    if (currentSolPrice <= 0) {
      throw new Error(`Invalid SOL price: $${currentSolPrice}. Cannot calculate fallback price.`);
    }
    
    const initialPriceUsd = initialPriceSol * currentSolPrice;
    
    // Create a fallback tick with warning
    tick = {
      mint,
      priceUsd: initialPriceUsd,
      priceSol: initialPriceSol,
      solUsd: currentSolPrice,
      timestamp: Date.now(),
      source: "fallback-initial-bonding-curve",
      marketCapUsd: undefined
    };
    
    console.warn({
      mint: mint.slice(0, 8),
      priceUsd: initialPriceUsd,
      priceSol: initialPriceSol
    }, "⚠️ [PriceFallback] Using ESTIMATED initial price - real price may differ after trades");
  }

  // Validate price is not zero or negative
  if (!tick.priceUsd || tick.priceUsd <= 0) {
    throw new Error(
      `Invalid price for token ${mint}: $${tick.priceUsd}. Cannot execute trade with zero or negative price.`
    );
  }

  // Validate price freshness (5 minutes) - skip for fallback prices
  if (tick.source !== "fallback-initial-bonding-curve") {
    const PRICE_STALENESS_THRESHOLD = 5 * 60 * 1000;
    const priceAge = Date.now() - tick.timestamp;
    if (priceAge > PRICE_STALENESS_THRESHOLD) {
      throw new Error(
        `Price data is stale for token ${mint} (${Math.floor(priceAge / 1000)}s old). ` +
        `Please try again when fresh price data is available.`
      );
    }
  }

  const priceUsd = D(tick.priceUsd);
  const currentSolPrice = priceService.getSolPrice();

  // Validate SOL price
  if (currentSolPrice <= 0) {
    throw new Error(`Invalid SOL price: $${currentSolPrice}. Cannot execute trade.`);
  }

  const solUsdAtFill = D(currentSolPrice);
  const priceSol = priceUsd.div(solUsdAtFill);
  const marketCapUsd = tick.marketCapUsd ? D(tick.marketCapUsd) : null;

  return {
    priceUsd,
    priceSol,
    solUsdAtFill,
    marketCapUsd,
    tick
  };
}

// ============================================================================
// POSITION VALIDATION
// ============================================================================

/**
 * Check and clamp sell quantity against available position
 * 
 * Handles:
 * - Position existence check
 * - Quantity validation
 * - Rounding error tolerance (allows tiny differences)
 * - Automatic clamping for near-matches
 * 
 * @param userId - User ID
 * @param mint - Token mint address
 * @param qty - Requested sell quantity
 * @param tradeMode - PAPER or REAL trade mode
 * @returns Clamped quantity if needed, original quantity otherwise
 * @throws Error if no position exists or insufficient balance
 */
export async function checkAndClampSellQuantity(
  userId: string,
  mint: string,
  qty: Decimal,
  tradeMode: TradeMode
): Promise<PositionCheckResult> {
  const position = await prisma.position.findUnique({
    where: {
      userId_mint_tradeMode: { userId, mint, tradeMode }
    }
  });

  if (!position) {
    throw new Error(`No ${tradeMode.toLowerCase()} position found for token`);
  }

  const positionQty = position.qty as Decimal;
  const difference = positionQty.minus(qty);

  // Allow tiny rounding errors (e.g., 0.0001 difference from floating point)
  const EPSILON = D("0.0001");

  if (difference.lt(EPSILON.neg())) {
    // Position is less than required by more than epsilon
    throw new Error(
      `Insufficient token balance. Required: ${qty.toFixed(4)}, Available: ${positionQty.toFixed(4)}`
    );
  }

  // If trying to sell slightly more due to rounding, clamp to available
  if (difference.lt(0) && difference.gte(EPSILON.neg())) {
    console.log(
      `[TradeCommon] ⚠️ Clamping sell quantity from ${qty.toString()} to ${positionQty.toString()} (diff: ${difference.toString()})`
    );
    return {
      clampedQty: positionQty,
      wasClamped: true
    };
  }

  return {
    clampedQty: qty,
    wasClamped: false
  };
}

// ============================================================================
// POSITION UPDATES (BUY)
// ============================================================================

/**
 * Create FIFO lot for buy order
 * 
 * @param tx - Prisma transaction client
 * @param positionId - Position ID
 * @param userId - User ID
 * @param mint - Token mint address
 * @param qty - Quantity bought
 * @param priceUsd - USD price per unit
 * @param priceSol - SOL price per unit
 * @param solUsdAtFill - SOL/USD exchange rate at fill time
 * @param tradeMode - PAPER or REAL trade mode
 */
export async function createFIFOLot(
  tx: any,
  positionId: string,
  userId: string,
  mint: string,
  qty: Decimal,
  priceUsd: Decimal,
  priceSol: Decimal,
  solUsdAtFill: Decimal,
  tradeMode: TradeMode
) {
  return await tx.positionLot.create({
    data: {
      positionId,
      userId,
      mint,
      qtyRemaining: qty,
      unitCostUsd: priceUsd,
      unitCostSol: priceSol,
      solUsdAtBuy: solUsdAtFill,
      tradeMode
    }
  });
}

/**
 * Update position using VWAP for buy orders
 * 
 * @param tx - Prisma transaction client
 * @param userId - User ID
 * @param mint - Token mint address
 * @param currentQty - Current position quantity
 * @param currentCostBasis - Current cost basis
 * @param buyQty - Quantity being bought
 * @param priceUsd - USD price per unit
 * @param tradeMode - PAPER or REAL trade mode
 * @returns Updated position
 */
export async function updatePositionBuy(
  tx: any,
  userId: string,
  mint: string,
  currentQty: Decimal,
  currentCostBasis: Decimal,
  buyQty: Decimal,
  priceUsd: Decimal,
  tradeMode: TradeMode
) {
  const newVWAP = vwapBuy(currentQty, currentCostBasis, buyQty, priceUsd);
  
  return await tx.position.update({
    where: { userId_mint_tradeMode: { userId, mint, tradeMode } },
    data: {
      qty: newVWAP.newQty,
      costBasis: newVWAP.newBasis
    }
  });
}

// ============================================================================
// POSITION UPDATES (SELL)
// ============================================================================

/**
 * Execute FIFO sell and update lots
 * 
 * Handles:
 * - Fetching open lots in FIFO order
 * - Calculating realized PnL
 * - Updating consumed lots
 * - Validating cost basis
 * 
 * @param tx - Prisma transaction client
 * @param userId - User ID
 * @param mint - Token mint address
 * @param sellQty - Quantity being sold
 * @param priceUsd - USD price per unit
 * @param tradeMode - PAPER or REAL trade mode
 * @returns FIFO sell result with realized PnL and consumed lots
 */
export async function executeFIFOSell(
  tx: any,
  userId: string,
  mint: string,
  sellQty: Decimal,
  priceUsd: Decimal,
  tradeMode: TradeMode
): Promise<FIFOSellResult> {
  // Fetch open lots in FIFO order
  const lots = await tx.positionLot.findMany({
    where: {
      userId,
      mint,
      tradeMode,
      qtyRemaining: { gt: 0 }
    },
    orderBy: { createdAt: "asc" }
  });

  // Execute FIFO sell
  const { realized, consumed } = fifoSell(
    lots.map((l: any) => ({
      id: l.id,
      qtyRemaining: l.qtyRemaining as Decimal,
      unitCostUsd: l.unitCostUsd as Decimal
    })),
    sellQty,
    priceUsd
  );

  // Update consumed lots
  for (const c of consumed) {
    const lot = lots.find((l: any) => l.id === c.lotId)!;
    const newQty = (lot.qtyRemaining as Decimal).sub(c.qty);
    await tx.positionLot.update({
      where: { id: lot.id },
      data: { qtyRemaining: newQty }
    });
  }

  return {
    realizedPnL: realized,
    consumed
  };
}

/**
 * Update position after FIFO sell
 * 
 * Handles:
 * - Calculating new quantity and cost basis
 * - Validating cost basis (no negatives)
 * - Zeroing out closed positions
 * 
 * @param tx - Prisma transaction client
 * @param userId - User ID
 * @param mint - Token mint address
 * @param currentQty - Current position quantity
 * @param currentCostBasis - Current cost basis
 * @param sellQty - Quantity being sold
 * @param consumed - Array of consumed lots from FIFO sell
 * @param lots - Original lots array
 * @param tradeMode - PAPER or REAL trade mode
 * @returns Updated position
 */
export async function updatePositionSell(
  tx: any,
  userId: string,
  mint: string,
  currentQty: Decimal,
  currentCostBasis: Decimal,
  sellQty: Decimal,
  consumed: Array<{ lotId: string; qty: Decimal; pnl: Decimal }>,
  lots: any[],
  tradeMode: TradeMode
) {
  const newQty = currentQty.sub(sellQty);

  // Calculate total consumed cost from FIFO
  const totalConsumedCost = consumed.reduce((sum, c) => {
    const lot = lots.find((l: any) => l.id === c.lotId)!;
    return sum.add(c.qty.mul(lot.unitCostUsd as Decimal));
  }, D(0));

  let newBasis = currentCostBasis.sub(totalConsumedCost);

  // Validate: cost basis should never be negative
  if (newBasis.lt(0)) {
    console.error(
      `⚠️ FIFO calculation error: negative cost basis ${newBasis.toString()} ` +
      `for ${tradeMode} position (user=${userId}, mint=${mint.slice(0, 8)})`
    );
    newBasis = D(0); // Clamp to zero
  }

  // Zero out cost basis for fully closed positions
  if (newQty.eq(0)) {
    newBasis = D(0);
  }

  return await tx.position.update({
    where: { userId_mint_tradeMode: { userId, mint, tradeMode } },
    data: { qty: newQty, costBasis: newBasis }
  });
}

// ============================================================================
// POST-TRADE OPERATIONS
// ============================================================================

/**
 * Execute post-trade operations
 * 
 * Handles:
 * - Adding reward points
 * - Invalidating portfolio cache
 * - Prefetching price for next portfolio request
 * 
 * @param userId - User ID
 * @param mint - Token mint address
 * @param tradeValueUsd - Trade value in USD for reward calculation
 */
export async function executePostTradeOperations(
  userId: string,
  mint: string,
  tradeValueUsd: Decimal
): Promise<void> {
  // Add reward points (outside transaction for performance)
  await addTradePoints(userId, tradeValueUsd);

  // Invalidate portfolio cache to prevent stale data
  portfolioCoalescer.invalidate(`portfolio:${userId}`);
  console.log(`[TradeCommon] Invalidated portfolio cache for user ${userId}`);

  // Eagerly fetch price to cache for next portfolio request
  await priceService.getPrice(mint);
  console.log(`[TradeCommon] Prefetched price for ${mint.substring(0, 8)}...`);
}

/**
 * Helper to create market cap VWAP update
 * (Used in some trade services for market cap tracking)
 */
export function mcVwapUpdate(
  oldQty: Decimal,
  oldMcVwap: Decimal,
  buyQty: Decimal,
  mcAtFillUsd: Decimal | null
): Decimal {
  if (!mcAtFillUsd || mcAtFillUsd.lte(0)) return oldMcVwap;
  const newQty = oldQty.add(buyQty);
  return oldQty.eq(0)
    ? mcAtFillUsd
    : oldQty.mul(oldMcVwap).add(buyQty.mul(mcAtFillUsd)).div(newQty);
}
