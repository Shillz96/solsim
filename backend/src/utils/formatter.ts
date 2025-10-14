/**
 * Display Formatters
 * Never combine currency glyphs - one per line
 */
import { Decimal } from "@prisma/client/runtime/library";

export type Currency = "USD" | "SOL";

/**
 * Format money value based on currency
 */
function money(v: Decimal, c: Currency): string {
  if (c === "USD") return `$${v.toFixed(2)}`;
  return `${v.toFixed(4)} SOL`;
}

/**
 * Format price in USD (higher precision for micro-cap tokens)
 */
function priceUSD(v: Decimal): string {
  const num = v.toNumber();
  if (num >= 1) return `$${v.toFixed(4)}`;
  if (num >= 0.0001) return `$${v.toFixed(6)}`;
  if (num >= 0.000001) return `$${v.toFixed(8)}`;
  // Very small: show with leading zeros notation
  const str = v.toFixed(12);
  const match = str.match(/^0\.0+/);
  if (match) {
    const zeros = match[0].length - 2;
    if (zeros >= 5) {
      const significant = str.slice(match[0].length, match[0].length + 4);
      return `$0.0{${zeros}}${significant}`;
    }
  }
  return `$${str}`;
}

/**
 * Format price in SOL
 */
function priceSOL(v: Decimal): string {
  return `${v.toFixed(8)} SOL`;
}

/**
 * Format percentage
 */
function pct(v: Decimal): string {
  return `${v.mul(100).toFixed(2)}%`;
}

/**
 * Format token quantity
 */
function qty(v: Decimal, decimals: number = 2): string {
  const num = v.toNumber();
  if (num >= 10000) {
    // Compact format
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  }
  return v.toFixed(decimals);
}

export const fmt = {
  money,
  priceUSD,
  priceSOL,
  pct,
  qty,
};
