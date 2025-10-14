/**
 * Decimal Helpers for Precise Financial Calculations
 * Never use JS number for money/prices - always use Decimal
 */
import { Decimal } from "@prisma/client/runtime/library";

export const LAMPORTS_PER_SOL = new Decimal(1_000_000_000);

/**
 * Convert lamports (bigint) to SOL (Decimal)
 */
export function toSOL(lamports: bigint): Decimal {
  return new Decimal(lamports.toString()).div(LAMPORTS_PER_SOL);
}

/**
 * Convert token base units to decimal tokens
 */
export function tokenUnitsToDecimal(units: bigint, decimals: number): Decimal {
  return new Decimal(units.toString()).div(new Decimal(10).pow(decimals));
}

/**
 * Convert decimal amount to token base units
 */
export function decimalToUnits(amount: Decimal, decimals: number): bigint {
  return BigInt(amount.mul(Decimal.pow(10, decimals)).toFixed(0));
}

/**
 * Calculate buy cost including all fees
 */
export function buyCostSOL(
  grossSpentSOL: Decimal,
  dexFeesSOL: Decimal,
  l1SOL: Decimal,
  tipSOL: Decimal
): Decimal {
  return grossSpentSOL.plus(dexFeesSOL).plus(l1SOL).plus(tipSOL);
}

/**
 * Calculate sell proceeds after all fees
 */
export function sellProceedsSOL(
  grossReceivedSOL: Decimal,
  dexFeesSOL: Decimal,
  l1SOL: Decimal,
  tipSOL: Decimal
): Decimal {
  return grossReceivedSOL.minus(dexFeesSOL).minus(l1SOL).minus(tipSOL);
}

/**
 * Simulate DEX fees for a trade
 * Returns { dexFee, l1Fee, tipFee }
 */
export function simulateFees(grossSOL: Decimal) {
  const dexFeeRate = new Decimal(0.005); // 0.5% DEX fee
  const l1Fee = new Decimal(0.00001); // 0.00001 SOL L1 fee
  const tipFee = new Decimal(0); // No priority tip by default

  return {
    dexFee: grossSOL.mul(dexFeeRate),
    l1Fee,
    tipFee,
  };
}

/**
 * Convert SOL amount to USD using current SOL price
 * @param sol - SOL amount as Decimal
 * @param solUsd - Current SOL→USD exchange rate
 * @returns USD value as Decimal
 */
export function usdFromSOL(sol: Decimal, solUsd: Decimal): Decimal {
  return sol.mul(solUsd);
}

/**
 * Convert USD amount to SOL using current SOL price
 * @param usd - USD amount as Decimal
 * @param solUsd - Current SOL→USD exchange rate
 * @returns SOL value as Decimal
 */
export function solFromUSD(usd: Decimal, solUsd: Decimal): Decimal {
  if (solUsd.isZero()) {
    throw new Error("SOL/USD rate cannot be zero");
  }
  return usd.div(solUsd);
}

/**
 * Convert SOL lamports to USD using current SOL price
 * @param lamports - Lamports as bigint
 * @param solUsd - Current SOL→USD exchange rate
 * @returns USD value as Decimal
 */
export function usdFromLamports(lamports: bigint, solUsd: Decimal): Decimal {
  const sol = toSOL(lamports);
  return usdFromSOL(sol, solUsd);
}

/**
 * Convert USD to SOL lamports using current SOL price
 * @param usd - USD amount as Decimal
 * @param solUsd - Current SOL→USD exchange rate
 * @returns Lamports as bigint
 */
export function lamportsFromUSD(usd: Decimal, solUsd: Decimal): bigint {
  const sol = solFromUSD(usd, solUsd);
  return BigInt(sol.mul(LAMPORTS_PER_SOL).toFixed(0));
}

/**
 * Calculate token price in USD given SOL price and token/SOL ratio
 * @param tokenPerSol - Token amount per SOL
 * @param solUsd - Current SOL→USD exchange rate
 * @returns Token price in USD
 */
export function tokenPriceUSD(tokenPerSol: Decimal, solUsd: Decimal): Decimal {
  const solPerToken = new Decimal(1).div(tokenPerSol);
  return usdFromSOL(solPerToken, solUsd);
}

/**
 * Calculate token price in SOL given USD price and SOL price
 * @param tokenPriceUsd - Token price in USD
 * @param solUsd - Current SOL→USD exchange rate
 * @returns Token price in SOL
 */
export function tokenPriceSOL(tokenPriceUsd: Decimal, solUsd: Decimal): Decimal {
  return solFromUSD(tokenPriceUsd, solUsd);
}