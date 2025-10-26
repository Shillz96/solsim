/**
 * Token Utility Functions
 * 
 * Shared utility functions for token-related operations across components.
 * Extracted to reduce duplication and ensure consistency.
 * 
 * @fileoverview Token-related utility functions for consistent formatting and calculations
 * @author 1UP SOL Development Team
 * @since 2025-01-27
 */

/**
 * Format a price with dynamic precision based on magnitude
 * @param price The price to format
 * @returns Formatted price string with appropriate decimal places
 */
export function formatPrice(price: number): string {
  if (price >= 100) return price.toFixed(2)
  if (price >= 1) return price.toFixed(4)
  if (price >= 0.01) return price.toFixed(6)
  if (price >= 0.0001) return price.toFixed(8)
  return price.toFixed(10)
}

/**
 * Format time ago from timestamp
 * @param timestamp Unix timestamp in milliseconds
 * @returns Human-readable time ago string
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  return `${hours}h ago`
}

/**
 * Get price change color classes based on value
 * @param value The price change value (positive or negative)
 * @returns CSS classes for positive/negative styling using Mario theme colors
 * @example
 * ```typescript
 * const colorClass = getPriceChangeColor(5.2) // "text-luigi"
 * const colorClass = getPriceChangeColor(-3.1) // "text-mario"
 * ```
 */
export function getPriceChangeColor(value: number): string {
  return value >= 0 
    ? "text-luigi" 
    : "text-mario"
}

/**
 * Get price change icon component name based on value
 * @param value The price change value (positive or negative)
 * @returns Icon component name as string ("TrendingUp" or "TrendingDown")
 * @example
 * ```typescript
 * const iconName = getPriceChangeIcon(5.2) // "TrendingUp"
 * const iconName = getPriceChangeIcon(-3.1) // "TrendingDown"
 * ```
 */
export function getPriceChangeIcon(value: number): "TrendingUp" | "TrendingDown" {
  return value >= 0 ? "TrendingUp" : "TrendingDown"
}
