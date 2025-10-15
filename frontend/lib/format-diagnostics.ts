/**
 * Numeric Formatting Diagnostics
 *
 * Utilities for debugging and verifying correct numeric display
 * throughout the VirtualSol application
 */

import { formatUSD, formatPriceUSD, formatQty, safePercent } from './format';

interface DiagnosticResult {
  value: any;
  type: string;
  isFinite: boolean;
  isNaN: boolean;
  formatted: string;
  issues: string[];
}

/**
 * Diagnose a value and its formatting
 */
export function diagnoseValue(value: any, label: string, formatter?: (v: number) => string): DiagnosticResult {
  const issues: string[] = [];
  const type = typeof value;
  const isFiniteValue = isFinite(value);
  const isNaNValue = isNaN(value);
  
  // Check for common issues
  if (value === null) issues.push('Value is null');
  if (value === undefined) issues.push('Value is undefined');
  if (isNaNValue) issues.push('Value is NaN');
  if (!isFiniteValue && !isNaNValue) issues.push('Value is not finite (likely Infinity)');
  if (type !== 'number' && type !== 'string') issues.push(`Unexpected type: ${type}`);
  
  // Format the value
  let formatted = 'ERROR';
  try {
    if (formatter) {
      formatted = formatter(Number(value));
    } else {
      formatted = formatUSD(Number(value));
    }
  } catch (error) {
    issues.push(`Formatting error: ${error}`);
  }
  
  const result: DiagnosticResult = {
    value,
    type,
    isFinite: isFiniteValue,
    isNaN: isNaNValue,
    formatted,
    issues
  };
  
  // Log if there are issues
  if (issues.length > 0) {
    console.warn(`[NUMERIC DIAGNOSTIC] ${label}:`, result);
  }
  
  return result;
}

/**
 * Diagnose percentage calculation
 */
export function diagnosePercentage(numerator: any, denominator: any, label: string): DiagnosticResult {
  const issues: string[] = [];
  
  // Check both values
  const numResult = diagnoseValue(numerator, `${label}.numerator`);
  const denResult = diagnoseValue(denominator, `${label}.denominator`);
  
  issues.push(...numResult.issues);
  issues.push(...denResult.issues);
  
  // Check for percentage-specific issues
  if (denominator === 0) issues.push('Denominator is zero (would cause Infinity%)');
  if (denominator < 0) issues.push('Denominator is negative (unusual for cost basis)');
  
  const formatted = safePercent(Number(numerator), Number(denominator));
  
  const result: DiagnosticResult = {
    value: { numerator, denominator },
    type: 'percentage',
    isFinite: isFinite(numerator) && isFinite(denominator),
    isNaN: isNaN(numerator) || isNaN(denominator),
    formatted,
    issues
  };
  
  if (issues.length > 0) {
    console.warn(`[PERCENTAGE DIAGNOSTIC] ${label}:`, result);
  }
  
  return result;
}

/**
 * Diagnose mint decimals and quantity conversion
 */
export function diagnoseQuantity(rawAmount: any, decimals: any, symbol: string, label: string): DiagnosticResult {
  const issues: string[] = [];
  
  // Check raw amount
  const rawResult = diagnoseValue(rawAmount, `${label}.rawAmount`);
  issues.push(...rawResult.issues);
  
  // Check decimals
  if (typeof decimals !== 'number') issues.push(`Decimals is not a number: ${typeof decimals}`);
  if (decimals < 0) issues.push(`Negative decimals: ${decimals}`);
  if (decimals > 18) issues.push(`Unusually high decimals: ${decimals} (possible error)`);
  if (!Number.isInteger(decimals)) issues.push(`Decimals is not an integer: ${decimals}`);
  
  // Calculate and format
  const scaledAmount = Number(rawAmount) / Math.pow(10, Number(decimals));
  const formatted = formatQty(rawAmount, Number(decimals), symbol);
  
  const result: DiagnosticResult = {
    value: { rawAmount, decimals, scaledAmount, symbol },
    type: 'quantity',
    isFinite: isFinite(scaledAmount),
    isNaN: isNaN(scaledAmount),
    formatted,
    issues
  };
  
  if (issues.length > 0) {
    console.warn(`[QUANTITY DIAGNOSTIC] ${label}:`, result);
  }
  
  return result;
}

/**
 * Comprehensive portfolio diagnostics
 */
export function diagnosePortfolioData(portfolioData: any): void {
  console.group('[PORTFOLIO DIAGNOSTICS]');
  
  if (!portfolioData) {
    console.error('Portfolio data is null/undefined');
    return;
  }
  
  // Check overall portfolio metrics
  if (portfolioData.totalValue !== undefined) {
    diagnoseValue(portfolioData.totalValue, 'Portfolio.totalValue');
  }
  
  if (portfolioData.totalPnL !== undefined && portfolioData.totalCost !== undefined) {
    diagnosePercentage(portfolioData.totalPnL, portfolioData.totalCost, 'Portfolio.pnlPercent');
  }
  
  // Check positions
  if (portfolioData.positions && Array.isArray(portfolioData.positions)) {
    portfolioData.positions.forEach((position: any, index: number) => {
      const prefix = `Position[${index}]`;
      
      if (position.valueUsd !== undefined) {
        diagnoseValue(position.valueUsd, `${prefix}.valueUsd`);
      }
      
      if (position.qty !== undefined && position.mint?.decimals !== undefined) {
        diagnoseQuantity(position.qty, position.mint.decimals, position.mint.symbol || 'UNKNOWN', `${prefix}.qty`);
      }
      
      if (position.unrealizedUsd !== undefined && position.avgCostUsd !== undefined) {
        const costBasis = Number(position.qty) * position.avgCostUsd;
        diagnosePercentage(position.unrealizedUsd, costBasis, `${prefix}.unrealizedPercent`);
      }
    });
  }
  
  console.groupEnd();
}

/**
 * Quick checklist for common numeric issues
 */
export function runNumericHealthCheck(): void {
  console.group('[NUMERIC HEALTH CHECK]');
  
  // Test formatters with edge cases
  const testCases = [
    { value: 0, label: 'Zero' },
    { value: 0.000001, label: 'Very small positive' },
    { value: -0.000001, label: 'Very small negative' },
    { value: Infinity, label: 'Infinity' },
    { value: -Infinity, label: 'Negative Infinity' },
    { value: NaN, label: 'NaN' },
    { value: null, label: 'Null' },
    { value: undefined, label: 'Undefined' },
    { value: '123.45', label: 'String number' },
    { value: 'abc', label: 'Invalid string' },
  ];
  
  console.log('Testing formatUSD:');
  testCases.forEach(({ value, label }) => {
    try {
      const result = formatUSD(value as number);
      console.log(`  ${label}: ${value} → ${result}`);
    } catch (error) {
      console.error(`  ${label}: ${value} → ERROR: ${error}`);
    }
  });
  
  console.log('Testing safePercent:');
  const percentCases = [
    { num: 10, den: 100, label: 'Normal case' },
    { num: 10, den: 0, label: 'Zero denominator' },
    { num: Infinity, den: 100, label: 'Infinite numerator' },
    { num: 10, den: Infinity, label: 'Infinite denominator' },
  ];
  
  percentCases.forEach(({ num, den, label }) => {
    try {
      const result = safePercent(num, den);
      console.log(`  ${label}: ${num}/${den} → ${result}`);
    } catch (error) {
      console.error(`  ${label}: ${num}/${den} → ERROR: ${error}`);
    }
  });
  
  console.groupEnd();
}

// Auto-run health check in development
if (process.env.NODE_ENV === 'development') {
  // Uncomment to run on load:
  // runNumericHealthCheck();
}