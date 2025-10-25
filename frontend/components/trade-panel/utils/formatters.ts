/**
 * Trade Panel Formatting Utilities
 * Consistent formatting for trade-related values
 */

/**
 * Format SOL amount with appropriate decimals
 */
export function formatSolAmount(amount: number): string {
  if (amount === 0) return '0'
  if (amount < 0.0001) return amount.toFixed(8)
  if (amount < 1) return amount.toFixed(4)
  return amount.toFixed(2)
}

/**
 * Format token quantity with smart precision
 */
export function formatTokenAmount(quantity: number): string {
  if (quantity === 0) return '0'
  if (quantity < 0.000001) return quantity.toExponential(2)
  if (quantity < 0.01) return quantity.toFixed(8)
  if (quantity < 1) return quantity.toFixed(6)
  if (quantity < 1000) return quantity.toFixed(4)
  if (quantity < 1000000) return quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return quantity.toExponential(2)
}

/**
 * Format USD value with dollar sign
 */
export function formatUsdAmount(amount: number): string {
  if (Math.abs(amount) < 0.01 && amount !== 0) {
    return `$${amount.toFixed(6)}`
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format percentage with appropriate sign and decimals
 */
export function formatPercentage(percent: number): string {
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

/**
 * Format price with high precision for micro-cap tokens
 */
export function formatPrice(price: number): string {
  if (price === 0) return '$0'
  if (price < 0.00000001) return `$${price.toExponential(2)}`
  if (price < 0.0001) return `$${price.toFixed(8)}`
  if (price < 1) return `$${price.toFixed(6)}`
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format SOL equivalent display
 */
export function formatSolEquivalent(priceUsd: number, solPrice: number): string {
  if (solPrice === 0) return '~0 SOL'
  const solAmount = priceUsd / solPrice
  return `~${formatSolAmount(solAmount)} SOL`
}
