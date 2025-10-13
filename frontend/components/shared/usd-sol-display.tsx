/**
 * SOL Equivalent Display Components
 * 
 * Standardized React components for displaying USD values with SOL equivalents
 */

import React from 'react'
import { formatUSD } from "@/lib/format"
import { formatSolEquivalent, UsdWithSolProps } from "@/lib/sol-equivalent-utils"

/**
 * Standard display pattern for USD values with SOL equivalents
 * Use this component consistently across the app for financial displays
 */
export const UsdWithSolDisplay: React.FC<UsdWithSolProps> = ({ 
  usdValue, 
  solPrice, 
  className = "",
  showSolEquivalent = true 
}) => {
  return (
    <div className={className}>
      <div>{formatUSD(usdValue)}</div>
      {showSolEquivalent && solPrice > 0 && (
        <div className="text-xs text-muted-foreground">
          {formatSolEquivalent(usdValue, solPrice)}
        </div>
      )}
    </div>
  )
}

/**
 * Inline display for USD with SOL equivalent in parentheses
 */
export const UsdWithSolInline: React.FC<UsdWithSolProps> = ({ 
  usdValue, 
  solPrice, 
  className = "",
  showSolEquivalent = true 
}) => {
  const solEquivalent = showSolEquivalent && solPrice > 0 ? formatSolEquivalent(usdValue, solPrice) : ''
  
  return (
    <span className={className}>
      {formatUSD(usdValue)}
      {solEquivalent && (
        <span className="text-muted-foreground ml-1">({solEquivalent})</span>
      )}
    </span>
  )
}