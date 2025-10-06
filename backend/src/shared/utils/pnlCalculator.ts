/**
 * Unified PnL Calculator - Single Source of Truth
 * 
 * This module consolidates all PnL calculation logic to ensure
 * consistency across frontend and backend systems.
 */

import { Decimal } from 'decimal.js';

// Constants for PnL calculations (self-contained, no external dependencies)
const DEFAULT_SOL_PRICE = 240;
const DECIMAL_PRECISION = {
  SOL: 8,      // SOL amounts: 8 decimal places
  USD: 2,      // USD amounts: 2 decimal places  
  PERCENT: 2,  // Percentages: 2 decimal places
  TOKENS: 6,   // Token quantities: 6 decimal places
} as const;

export interface PnLInput {
  quantity: string | number | Decimal;
  entryPriceSol: string | number | Decimal;  // Always in SOL per token
  currentPriceUsd: string | number | Decimal; // Always in USD per token
  solPriceUsd: number; // Current SOL price in USD
}

export interface PnLResult {
  // Investment amounts
  investedSol: string;
  investedUsd: string;
  
  // Current values
  currentValueSol: string;
  currentValueUsd: string;
  
  // PnL calculations
  pnlSol: string;
  pnlUsd: string;
  pnlPercent: number;
  
  // Metadata
  calculatedAt: string;
  solPriceUsed: number;
}

/**
 * MASTER PnL calculation function - used everywhere
 * 
 * This is the ONLY function that should calculate PnL.
 * All other PnL calculations should be removed and replaced with this.
 */
export function calculatePnL(input: PnLInput): PnLResult {
  // Convert all inputs to Decimal for precision
  const quantity = new Decimal(input.quantity || 0);
  const entryPriceSol = new Decimal(input.entryPriceSol || 0);
  const currentPriceUsd = new Decimal(input.currentPriceUsd || 0);
  const solPriceUsd = new Decimal(input.solPriceUsd || DEFAULT_SOL_PRICE);
  
  // Validate inputs
  if (solPriceUsd.lte(0)) {
    throw new Error(`Invalid SOL price: ${solPriceUsd.toString()}`);
  }
  
  // PRODUCTION FIX: Handle invalid token prices that cause -99% PnL
  if (currentPriceUsd.lt(0)) {
    throw new Error(`Invalid current price: ${currentPriceUsd.toString()}`);
  }
  
  // Investment calculation (always SOL-based)
  const investedSol = quantity.mul(entryPriceSol);
  const investedUsd = investedSol.mul(solPriceUsd);
  
  // Current value calculation
  const currentValueUsd = quantity.mul(currentPriceUsd);
  const currentValueSol = currentValueUsd.div(solPriceUsd);
  
  // PnL calculation (the critical part)
  const pnlUsd = currentValueUsd.sub(investedUsd);
  const pnlSol = currentValueSol.sub(investedSol);
  let pnlPercent = investedUsd.eq(0) ? 0 : pnlUsd.div(investedUsd).mul(100).toNumber();
  
  // PRODUCTION FIX: Cap extreme percentage values to prevent -99% display bugs
  if (pnlPercent < -99.9) {
    pnlPercent = -99.9;
  } else if (pnlPercent > 9999) {
    pnlPercent = 9999;
  }
  
  return {
    investedSol: investedSol.toFixed(DECIMAL_PRECISION.SOL),
    investedUsd: investedUsd.toFixed(DECIMAL_PRECISION.USD),
    currentValueSol: currentValueSol.toFixed(DECIMAL_PRECISION.SOL),
    currentValueUsd: currentValueUsd.toFixed(DECIMAL_PRECISION.USD),
    pnlSol: pnlSol.toFixed(DECIMAL_PRECISION.SOL),
    pnlUsd: pnlUsd.toFixed(DECIMAL_PRECISION.USD),
    pnlPercent: Number(pnlPercent.toFixed(DECIMAL_PRECISION.PERCENT)),
    calculatedAt: new Date().toISOString(),
    solPriceUsed: solPriceUsd.toNumber(),
  };
}

/**
 * Utility function for quick PnL percentage calculation
 */
export function calculatePnLPercent(
  investedAmount: string | number | Decimal,
  currentValue: string | number | Decimal
): number {
  const invested = new Decimal(investedAmount);
  const current = new Decimal(currentValue);
  
  if (invested.eq(0)) return 0;
  
  const percent = current.sub(invested).div(invested).mul(100).toNumber();
  
  // Cap extreme values
  if (percent < -99.9) return -99.9;
  if (percent > 9999) return 9999;
  
  return Number(percent.toFixed(DECIMAL_PRECISION.PERCENT));
}

/**
 * Utility function for calculating total portfolio PnL
 */
export function calculateTotalPnL(
  holdings: Array<{
    quantity: string | number | Decimal;
    entryPriceSol: string | number | Decimal;
    currentPriceUsd: string | number | Decimal;
  }>,
  solPriceUsd: number
): PnLResult {
  let totalInvestedSol = new Decimal(0);
  let totalInvestedUsd = new Decimal(0);
  let totalCurrentValueSol = new Decimal(0);
  let totalCurrentValueUsd = new Decimal(0);
  
  holdings.forEach(holding => {
    const pnl = calculatePnL({
      ...holding,
      solPriceUsd
    });
    
    totalInvestedSol = totalInvestedSol.add(pnl.investedSol);
    totalInvestedUsd = totalInvestedUsd.add(pnl.investedUsd);
    totalCurrentValueSol = totalCurrentValueSol.add(pnl.currentValueSol);
    totalCurrentValueUsd = totalCurrentValueUsd.add(pnl.currentValueUsd);
  });
  
  const totalPnlSol = totalCurrentValueSol.sub(totalInvestedSol);
  const totalPnlUsd = totalCurrentValueUsd.sub(totalInvestedUsd);
  const totalPnlPercent = totalInvestedUsd.eq(0) ? 0 : 
    totalPnlUsd.div(totalInvestedUsd).mul(100).toNumber();
  
  return {
    investedSol: totalInvestedSol.toFixed(DECIMAL_PRECISION.SOL),
    investedUsd: totalInvestedUsd.toFixed(DECIMAL_PRECISION.USD),
    currentValueSol: totalCurrentValueSol.toFixed(DECIMAL_PRECISION.SOL),
    currentValueUsd: totalCurrentValueUsd.toFixed(DECIMAL_PRECISION.USD),
    pnlSol: totalPnlSol.toFixed(DECIMAL_PRECISION.SOL),
    pnlUsd: totalPnlUsd.toFixed(DECIMAL_PRECISION.USD),
    pnlPercent: Number(totalPnlPercent.toFixed(DECIMAL_PRECISION.PERCENT)),
    calculatedAt: new Date().toISOString(),
    solPriceUsed: solPriceUsd,
  };
}