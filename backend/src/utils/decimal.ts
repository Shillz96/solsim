import { Decimal } from 'decimal.js';

/**
 * Decimal utility functions for precise financial calculations
 * Always construct Decimal from strings to avoid precision loss
 */

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
});

/**
 * Safely create a Decimal from various input types
 * @param value - String, number, or existing Decimal
 * @returns Decimal instance
 */
export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) {
    return value;
  }
  if (typeof value === 'string') {
    return new Decimal(value);
  }
  // For numbers, convert to string first to avoid precision loss
  return new Decimal(value.toString());
}

/**
 * Safe decimal addition
 */
export function add(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return toDecimal(a).add(toDecimal(b));
}

/**
 * Safe decimal subtraction
 */
export function subtract(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return toDecimal(a).sub(toDecimal(b));
}

/**
 * Safe decimal multiplication
 */
export function multiply(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return toDecimal(a).mul(toDecimal(b));
}

/**
 * Safe decimal division
 */
export function divide(a: string | number | Decimal, b: string | number | Decimal): Decimal {
  return toDecimal(a).div(toDecimal(b));
}

/**
 * Calculate percentage of a value
 */
export function percentage(value: string | number | Decimal, percent: string | number | Decimal): Decimal {
  return multiply(value, divide(percent, 100));
}

/**
 * Calculate percentage change between two values
 */
export function percentageChange(oldValue: string | number | Decimal, newValue: string | number | Decimal): Decimal {
  const old = toDecimal(oldValue);
  const change = subtract(newValue, oldValue);
  return old.isZero() ? new Decimal(0) : multiply(divide(change, old), 100);
}

/**
 * Format decimal for display with specified decimal places
 */
export function formatDecimal(value: string | number | Decimal, decimals: number = 6): string {
  return toDecimal(value).toFixed(decimals);
}

/**
 * Convert decimal to number for display (use sparingly)
 * Only use when you absolutely need a JavaScript number
 */
export function toNumber(value: string | number | Decimal): number {
  return toDecimal(value).toNumber();
}

/**
 * Serialize Decimal objects to strings for API responses
 * Ensures consistent string representation of decimals
 */
export function serializeDecimal(value: string | number | Decimal | null | undefined): string | null {
  if (value == null) return null;
  return toDecimal(value).toString();
}

/**
 * Serialize an object containing Decimal fields to strings
 * Recursively processes nested objects and arrays
 */
export function serializeDecimals(obj: any): any {
  if (obj == null) return obj;

  if (obj instanceof Decimal) {
    return obj.toString();
  }

  // Handle Prisma Decimal objects (they have s, e, d properties)
  if (obj && typeof obj === 'object' && 'e' in obj && 'd' in obj && Array.isArray(obj.d)) {
    return new Decimal(obj).toString();
  }

  // Handle BigInt - convert to string
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Handle Date objects - keep them as Date objects, don't serialize them
  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeDecimals(item));
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDecimals(value);
    }
    return result;
  }

  return obj;
}

/**
 * Check if a decimal value is zero
 */
export function isZero(value: string | number | Decimal): boolean {
  return toDecimal(value).isZero();
}

/**
 * Check if a decimal value is positive
 */
export function isPositive(value: string | number | Decimal): boolean {
  return toDecimal(value).isPositive();
}

/**
 * Check if a decimal value is negative
 */
export function isNegative(value: string | number | Decimal): boolean {
  return toDecimal(value).isNegative();
}

/**
 * Get absolute value
 */
export function abs(value: string | number | Decimal): Decimal {
  return toDecimal(value).abs();
}

/**
 * Round to specified decimal places
 */
export function round(value: string | number | Decimal, decimals: number): Decimal {
  return toDecimal(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

/**
 * Calculate weighted average price
 */
export function weightedAverage(
  quantities: (string | number | Decimal)[],
  prices: (string | number | Decimal)[]
): Decimal {
  if (quantities.length !== prices.length) {
    throw new Error('Quantities and prices arrays must have the same length');
  }

  const totalValue = quantities.reduce((sum, qty, index) =>
    add(sum, multiply(qty, prices[index])), new Decimal(0));

  const totalQuantity = quantities.reduce((sum, qty) =>
    add(sum, qty), new Decimal(0));

  const totalQuantityDecimal = new Decimal(totalQuantity);
  return totalQuantityDecimal.isZero() ? new Decimal(0) : divide(totalValue, totalQuantity);
}

/**
 * Calculate cost basis (quantity * entry price)
 */
// PnL calculation functions removed - use shared/utils/pnlCalculator.ts instead
// This ensures consistent currency conversion and financial precision across the application

/**
 * Validate decimal string format
 */
export function isValidDecimalString(value: string): boolean {
  try {
    new Decimal(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse decimal from string safely
 */
export function parseDecimal(value: string): Decimal | null {
  try {
    return new Decimal(value);
  } catch {
    return null;
  }
}
