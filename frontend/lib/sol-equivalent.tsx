/**
 * SOL Equivalent Display Components
 * 
 * Standardized React components for displaying USD values with SOL equivalents
 * Integrates with the price stream to show real-time conversions
 */

import { usePriceStreamContext } from "@/lib/price-stream-provider";
import { cn } from "@/lib/utils";

interface SolEquivProps {
  /** USD value to convert to SOL */
  usd: number;
  /** Additional CSS classes */
  className?: string;
  /** Hide when SOL price is unavailable */
  hideWhenUnavailable?: boolean;
}

/**
 * Display SOL equivalent for a USD value
 * Shows on a muted second line with intelligent precision
 */
export function SolEquiv({ usd, className, hideWhenUnavailable = false }: SolEquivProps) {
  const { prices } = usePriceStreamContext();
  const solPrice = prices.get("So11111111111111111111111111111111111111112")?.price || 0;
  
  if (!solPrice || !isFinite(usd)) {
    return hideWhenUnavailable ? null : (
      <div className={cn("text-xs text-muted-foreground", className)}>
        — SOL
      </div>
    );
  }
  
  const solValue = usd / solPrice;
  
  let formatted = "";
  if (solValue >= 1) {
    formatted = `${solValue.toFixed(2)} SOL`;
  } else if (solValue >= 0.01) {
    formatted = `${solValue.toFixed(4)} SOL`;
  } else if (solValue >= 0.0001) {
    formatted = `${solValue.toFixed(6)} SOL`;
  } else {
    formatted = `${solValue.toFixed(8)} SOL`;
  }
  
  return (
    <div className={cn("text-xs text-muted-foreground", className)}>
      {formatted}
    </div>
  );
}

interface UsdWithSolProps {
  /** USD value to display */
  usd: number;
  /** Main value CSS classes */
  className?: string;
  /** SOL equivalent CSS classes */
  solClassName?: string;
  /** Format as compact notation for large values */
  compact?: boolean;
  /** Custom prefix (e.g., '+', '-') */
  prefix?: string;
}

/**
 * Display USD value with SOL equivalent underneath
 * Complete component with both values styled consistently
 */
export function UsdWithSol({ 
  usd, 
  className, 
  solClassName, 
  compact = true, 
  prefix = "" 
}: UsdWithSolProps) {
  const formatUSD = (value: number): string => {
    if (!isFinite(value)) return "$0.00";

    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (compact && abs >= 10_000) {
      const compactFormatter = new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1
      });
      return `${sign}$${compactFormatter.format(abs)}`;
    }

    if (abs >= 1) {
      return `${sign}$${abs.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }

    if (abs >= 0.01) {
      return `${sign}$${abs.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3
      })}`;
    }

    if (abs === 0) {
      return "$0.00";
    }

    return `${sign}$${abs.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6
    })}`;
  };
  
  // Apply prefix only if it makes sense
  // Don't add '+' prefix to negative numbers or '-' prefix to positive numbers
  const shouldUsePrefix = prefix && (
    (prefix === '+' && usd >= 0) ||
    (prefix === '-' && usd < 0) ||
    (prefix !== '+' && prefix !== '-')
  );

  return (
    <div className="flex flex-col">
      <span className={cn("font-medium", className)}>
        {shouldUsePrefix ? prefix : ''}{formatUSD(usd)}
      </span>
      <SolEquiv usd={usd} className={solClassName} />
    </div>
  );
}

interface PnLWithSolProps {
  /** PnL amount in USD */
  pnlUsd: number;
  /** Cost basis for percentage calculation */
  costUsd: number;
  /** Additional CSS classes */
  className?: string;
  /** Show percentage on same line */
  showPercentageInline?: boolean;
}

/**
 * Display PnL with proper colorization and SOL equivalent
 * Handles edge cases like zero cost basis (airdrops)
 */
export function PnLWithSol({ 
  pnlUsd, 
  costUsd, 
  className,
  showPercentageInline = false 
}: PnLWithSolProps) {
  const getColor = (value: number): string => {
    if (value > 0) return "text-profit";
    if (value < 0) return "text-loss";
    return "text-muted-foreground";
  };
  
  const formatPercentage = (): string => {
    if (!isFinite(pnlUsd) || !isFinite(costUsd) || costUsd === 0) {
      return "—";
    }
    
    const pct = (pnlUsd / costUsd) * 100;
    
    if (!isFinite(pct)) {
      return "—";
    }
    
    const abs = Math.abs(pct);
    const digits = abs < 1000 ? 2 : abs < 10000 ? 1 : 0;
    const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
    
    return `${sign}${Math.abs(pct).toFixed(digits)}%`;
  };
  
  const color = getColor(pnlUsd);
  const percentage = formatPercentage();
  
  return (
    <div className={cn("flex flex-col", className)}>
      <div className={cn("font-medium flex items-center gap-2", color)}>
        <UsdWithSol usd={pnlUsd} className={color} compact />
        {showPercentageInline && (
          <span className={cn("text-xs", color)}>
            ({percentage})
          </span>
        )}
      </div>
      {!showPercentageInline && (
        <span className={cn("text-xs", color)}>
          {percentage}
        </span>
      )}
    </div>
  );
}

export { formatUSD, formatPriceUSD, formatQty, safePercent, pnlPercent } from "./format";