/**
 * Trade Calculation Utilities
 * Pure functions for trade-related calculations
 */

import type { TradeEstimate, TradeFees, RealtimePnL, PositionData } from '../types'

/**
 * Calculate how many tokens will be received for a given SOL amount
 */
export function calculateBuyEstimate(
  solAmount: number,
  solPrice: number,
  tokenPrice: number
): TradeEstimate {
  const usdValue = solAmount * solPrice
  const tokenQuantity = tokenPrice > 0 ? usdValue / tokenPrice : 0
  
  return {
    tokenQuantity,
    solAmount,
    usdValue
  }
}

/**
 * Calculate how much SOL will be received when selling tokens
 */
export function calculateSellEstimate(
  tokenQuantity: number,
  tokenPrice: number,
  solPrice: number
): TradeEstimate {
  const usdValue = tokenQuantity * tokenPrice
  const solAmount = solPrice > 0 ? usdValue / solPrice : 0
  
  return {
    tokenQuantity,
    solAmount,
    usdValue
  }
}

/**
 * Calculate trading fees
 * Default fee structure: 1% total (0.5% DEX + 0.5% platform)
 */
export function calculateTradeFees(
  solAmount: number,
  solPrice: number,
  feePercent: number = 1.0
): TradeFees {
  const estimatedFeeSol = solAmount * (feePercent / 100)
  const estimatedFeeUsd = estimatedFeeSol * solPrice
  
  return {
    totalFeePercent: feePercent,
    estimatedFeeSol,
    estimatedFeeUsd
  }
}

/**
 * Calculate real-time PnL based on current price
 */
export function calculateRealtimePnL(
  position: PositionData | null,
  currentPrice: number
): RealtimePnL | null {
  if (!position) return null
  
  const qty = parseFloat(position.qty)
  const avgCost = parseFloat(position.avgCostUsd)
  const currentValue = qty * currentPrice
  const costBasis = avgCost * qty
  const unrealizedPnL = currentValue - costBasis
  
  // Guard against division by zero
  const unrealizedPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0
  
  return {
    unrealizedPnL,
    unrealizedPercent,
    currentValue,
    costBasis
  }
}

/**
 * Calculate sell quantity based on percentage of holdings
 */
export function calculateSellQuantity(
  holdingQty: number,
  percentage: number
): number {
  return (holdingQty * percentage) / 100
}

/**
 * Round token quantity to reasonable precision (9 decimals)
 */
export function roundTokenQuantity(quantity: number): number {
  return Math.round(quantity * 1e9) / 1e9
}

/**
 * Validate SOL amount for buy trade
 */
export function validateBuyAmount(
  amount: number,
  balance: number
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' }
  }
  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance' }
  }
  return { valid: true }
}

/**
 * Validate percentage for sell trade
 */
export function validateSellPercentage(
  percentage: number,
  hasPosition: boolean
): { valid: boolean; error?: string } {
  if (!hasPosition) {
    return { valid: false, error: 'No position to sell' }
  }
  if (percentage <= 0 || percentage > 100) {
    return { valid: false, error: 'Invalid percentage' }
  }
  return { valid: true }
}
