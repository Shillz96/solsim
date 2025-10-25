/**
 * Token Utility Functions
 * 
 * Shared utility functions for token-related operations across components.
 * Extracted to reduce duplication and ensure consistency.
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
 * @param value The price change value
 * @returns CSS classes for positive/negative styling
 */
export function getPriceChangeColor(value: number): string {
  return value >= 0 
    ? "text-[var(--luigi-green)]" 
    : "text-[var(--mario-red)]"
}

/**
 * Get price change icon based on value
 * @param value The price change value
 * @returns TrendingUp or TrendingDown icon component
 */
export function getPriceChangeIcon(value: number) {
  return value >= 0 ? "TrendingUp" : "TrendingDown"
}
