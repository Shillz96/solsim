/**
 * SolSim Numeric & Display Formatting (v1)
 * 
 * Standardized formatting utilities ensuring:
 * - Values are believable at a glance
 * - Consistent across all pages
 * - Never show scary things like Infinity% or $0.00000000 unless appropriate
 * - Proper handling of edge cases (zero cost basis, airdrops, etc.)
 */

// Compact formatter for large numbers
export const compact = new Intl.NumberFormat("en-US", { 
  notation: "compact", 
  maximumFractionDigits: 1 
});

/**
 * Format USD currency values with intelligent precision
 * 
 * Rules:
 * - ≥ $10,000 → compact: $12.3K, $3.4M, $1.2B
 * - $1 – $9,999 → 2 decimals: $1,234.56
 * - $0.01 – $0.99 → 2–3 decimals depending on magnitude
 * - < $0.01 (micro-caps) → 4–6 decimals (trim trailing zeros)
 */
export function formatUSD(n: number): string {
  if (!isFinite(n)) return "$0.00";
  
  const abs = Math.abs(n);
  
  if (abs >= 10_000) {
    return `$${compact.format(n)}`;
  }
  
  if (abs >= 1) {
    return `$${n.toLocaleString("en-US", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
  
  if (abs >= 0.01) {
    return `$${n.toLocaleString("en-US", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 3 
    })}`;
  }
  
  if (abs === 0) {
    return "$0.00";
  }
  
  // Micro-caps: 4–6 decimals, trim trailing zeros
  return `$${n.toLocaleString("en-US", { 
    minimumFractionDigits: 4, 
    maximumFractionDigits: 6 
  })}`;
}

/**
 * Format token prices in USD with precision based on magnitude
 * 
 * Rules:
 * - ≥ $1 → 2 decimals
 * - $0.10 – $0.99 → 3–4 decimals
 * - $0.000001 – $0.0999 → 6 decimals max (trim)
 * - < $0.000001 → scientific notation or very small decimals with tooltip
 */
export function formatPriceUSD(n: number): string {
  if (!isFinite(n)) return "$0.00";
  
  const abs = Math.abs(n);
  
  if (abs >= 1) {
    return `$${n.toLocaleString("en-US", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
  
  if (abs >= 0.1) {
    return `$${n.toLocaleString("en-US", { 
      minimumFractionDigits: 3, 
      maximumFractionDigits: 4 
    })}`;
  }
  
  if (abs >= 0.000001) {
    return `$${n.toLocaleString("en-US", { 
      minimumFractionDigits: 4, 
      maximumFractionDigits: 6 
    })}`;
  }
  
  if (abs === 0) {
    return "$0.00";
  }
  
  // Very small values: use scientific notation
  return `${n.toExponential(2)} USD`;
}

/**
 * Format token quantities using mint decimals
 * 
 * Rules:
 * - Use mint's decimals to scale raw amounts (never round in calculations, only in render)
 * - ≥ 10,000 → compact: 12.4K
 * - 1 – 9,999 → up to 2 decimals
 * - < 1 → 4–6 decimals (trim)
 * - Secondary text always shows the symbol: 3.46M BUFFER
 */
export function formatQty(raw: string | number, decimals: number, symbol?: string): string {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (!isFinite(n)) return symbol ? `0 ${symbol}` : "0";
  
  // Scale by mint decimals
  const qty = n / Math.pow(10, decimals);
  const abs = Math.abs(qty);
  
  let body = "";
  
  if (abs >= 10_000) {
    body = `${compact.format(qty)}`;
  } else if (abs >= 1) {
    body = qty.toLocaleString("en-US", { maximumFractionDigits: 2 });
  } else if (abs === 0) {
    body = "0";
  } else {
    body = qty.toLocaleString("en-US", { maximumFractionDigits: 6 });
  }
  
  return symbol ? `${body} ${symbol}` : body;
}

/**
 * Safe percentage formatting with guards for edge cases
 * 
 * Rules:
 * - Always show a sign: +12.34%, -0.85%
 * - |pct| < 1000% → 2 decimals, ≥ 1000% → 0–1 decimal
 * - Guard: when cost is 0 (airdrop/first fill), display — or N/A instead of Infinity%
 */
export function safePercent(numerator: number, denominator: number): string {
  if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0) {
    return "—";
  }
  
  const pct = (numerator / denominator) * 100;
  
  if (!isFinite(pct)) {
    return "—";
  }
  
  const abs = Math.abs(pct);
  const digits = abs < 1000 ? 2 : abs < 10000 ? 1 : 0;
  
  // Use proper minus sign for negative values
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  
  return `${sign}${Math.abs(pct).toFixed(digits)}%`;
}

/**
 * Calculate PnL percentage from current value and cost basis
 * This is the standard formula: (currentValue - costBasis) / costBasis * 100
 */
export function pnlPercent(currentValue: number, costBasis: number): string {
  if (!isFinite(currentValue) || !isFinite(costBasis) || costBasis === 0) {
    return "—";
  }
  
  const pnl = currentValue - costBasis;
  return safePercent(pnl, costBasis);
}

/**
 * Format numbers with intelligent precision (general purpose)
 */
export function formatNumber(n: number, options?: {
  maxDecimals?: number;
  minDecimals?: number;
  useCompact?: boolean;
}): string {
  const { maxDecimals = 2, minDecimals = 0, useCompact = true } = options || {};
  
  if (!isFinite(n)) return "0";
  
  const abs = Math.abs(n);
  
  if (useCompact && abs >= 10_000) {
    return compact.format(n);
  }
  
  return n.toLocaleString("en-US", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals
  });
}

/**
 * Diagnostic helper for troubleshooting formatting issues
 */
export function formatDiagnostic(value: any, label: string): void {
  if (!isFinite(value) || value === null || value === undefined) {
    console.warn(`[FORMAT DIAGNOSTIC] ${label}:`, {
      value,
      type: typeof value,
      isFinite: isFinite(value),
      isNaN: isNaN(value)
    });
  }
}

// =============================================================================
// BIGINT / LAMPORTS UTILITIES - Decimal-safe number handling
// =============================================================================

/**
 * Solana lamports per SOL constant as BigInt for precision
 */
export const LAMPORTS_PER_SOL = 1_000_000_000n;

/**
 * Convert lamports string to SOL display string
 * Eliminates float precision issues by working with integers only
 * 
 * @param lamportsStr - Integer string representing lamports
 * @returns Formatted SOL string (e.g. "1.5", "0.001", "123")
 */
export function lamportsToSolStr(lamportsStr: string): string {
  try {
    const n = BigInt(lamportsStr);
    const whole = n / LAMPORTS_PER_SOL;
    const remainder = n % LAMPORTS_PER_SOL;
    
    if (remainder === 0n) {
      return whole.toString();
    }
    
    // Convert remainder to 9-digit string, trim trailing zeros
    const fracStr = remainder.toString().padStart(9, "0").replace(/0+$/, "");
    return fracStr.length ? `${whole}.${fracStr}` : whole.toString();
  } catch (error) {
    console.error("❌ lamportsToSolStr failed:", error, lamportsStr);
    return "0";
  }
}

/**
 * Convert SOL amount to lamports BigInt
 * 
 * @param solAmount - SOL amount as number or string
 * @returns BigInt lamports value
 */
export function solToLamports(solAmount: number | string): bigint {
  try {
    // Keep as BigInt calculation to maintain precision
    if (typeof solAmount === 'string') {
      // Parse string as decimal parts to avoid float precision issues
      const [whole, frac = ''] = solAmount.split('.');
      const wholeLamports = BigInt(whole || '0') * LAMPORTS_PER_SOL;
      const fracPadded = frac.padEnd(9, '0').slice(0, 9);
      const fracLamports = BigInt(fracPadded);
      return wholeLamports + fracLamports;
    } else {
      // Only use Number() for actual numbers, but round carefully
      return BigInt(Math.round(solAmount * Number(LAMPORTS_PER_SOL)));
    }
  } catch (error) {
    console.error("❌ solToLamports failed:", error, solAmount);
    return 0n;
  }
}

/**
 * Convert USD price to lamports for decimal-safe storage
 * Requires current SOL price for accurate conversion
 * 
 * @param usdPrice - USD price as number
 * @param solPriceUsd - Current SOL price in USD
 * @returns BigInt lamports equivalent
 */
export function usdToLamports(usdPrice: number, solPriceUsd: number): bigint {
  if (solPriceUsd === 0) return 0n;
  
  try {
    const solEquivalent = usdPrice / solPriceUsd;
    return solToLamports(solEquivalent);
  } catch (error) {
    console.error("❌ usdToLamports failed:", error, { usdPrice, solPriceUsd });
    return 0n;
  }
}

/**
 * Convert lamports to USD using current SOL price
 * 
 * @param lamportsStr - Lamports as string
 * @param solPriceUsd - Current SOL price in USD
 * @returns USD value as number
 */
export function lamportsToUsd(lamportsStr: string, solPriceUsd: number): number {
  try {
    // Keep conversion as string until final calculation
    const solStr = lamportsToSolStr(lamportsStr);
    const solAmount = parseFloat(solStr); // Only parse at final step for USD calculation
    return solAmount * solPriceUsd;
  } catch (error) {
    console.error("❌ lamportsToUsd failed:", error, { lamportsStr, solPriceUsd });
    return 0;
  }
}

/**
 * Format lamports as SOL with appropriate precision
 * Uses the existing number formatting logic
 * 
 * @param lamportsStr - Lamports as string
/**
 * @returns Formatted SOL string with symbol
 */
export function formatLamportsAsSOL(lamportsStr: string): string {
  const solStr = lamportsToSolStr(lamportsStr);
  // Only parse for display formatting (not for calculations)
  const solNum = parseFloat(solStr);
  return `${formatNumber(solNum)} SOL`;
}

// Legacy compatibility exports (to be gradually replaced)
export { formatUSD as formatCurrency };
export { formatNumber as formatPercentage };