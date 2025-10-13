/**
 * SOL Equivalent Utility Functions (v2)
 * 
 * Updated to use the standardized formatting system from lib/sol-equivalent.tsx
 * Maintains backward compatibility while providing consistent SOL conversions
 */

import { formatUSD } from "@/lib/format"

/**
 * Formats a USD value as its SOL equivalent with intelligent precision
 * @param usdValue - The USD amount to convert
 * @param solPrice - The current SOL price in USD
 * @returns Formatted SOL equivalent string or empty string if no SOL price
 * @deprecated Use SolEquiv component from lib/sol-equivalent.tsx for new code
 */
export const formatSolEquivalent = (usdValue: number, solPrice: number): string => {
  if (!solPrice || solPrice === 0 || !isFinite(usdValue)) return ''
  
  const solValue = usdValue / solPrice
  
  // Use intelligent precision based on value size
  if (solValue >= 1) return `${solValue.toFixed(2)} SOL`
  else if (solValue >= 0.01) return `${solValue.toFixed(4)} SOL`
  else if (solValue >= 0.0001) return `${solValue.toFixed(6)} SOL`
  else return `${solValue.toFixed(8)} SOL`
}

/**
 * React component props for displaying USD values with SOL equivalents
 * @deprecated Use UsdWithSol component from lib/sol-equivalent.tsx for new code
 */
export interface UsdWithSolProps {
  usdValue: number
  solPrice: number
  className?: string
  showSolEquivalent?: boolean
}

// Re-export new formatting functions for convenience
export { formatUSD as formatCurrency, formatUSD }